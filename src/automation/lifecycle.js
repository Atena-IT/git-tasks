import getBackend from '../backends/index.js';
import { parseIssueTitle } from '../utils/format.js';
import { loadConfig } from '../utils/config.js';
import {
  getMetadataField,
  normalizeLifecycleStatus,
  parseMetadataList,
  parsePullRequestReference,
  parseReviewerList,
  setMetadataField,
  setMetadataListField,
} from '../utils/metadata.js';

export const WORKFLOW_STATUS_LABELS = [
  'status:open',
  'status:in-progress',
  'status:ready-for-review',
  'status:done',
];

const CHILD_CONFIG = {
  story: { label: 'user-story', parentType: 'sprint' },
  sprint: { label: 'sprint', parentType: 'epic' },
};

function getLabelNames(issue) {
  return (issue.labels || []).map((label) => label.name || label);
}

function parseRefNumber(ref) {
  if (!ref) return null;
  const match = String(ref).match(/#?(\d+)/);
  return match ? Number(match[1]) : null;
}

function getParentNumber(issue) {
  return parseRefNumber(parseIssueTitle(issue.title).ref);
}

function issueMatchesParent(issue, parentNumber) {
  return getParentNumber(issue) === Number(parentNumber);
}

function isClosed(issue) {
  return String(issue.state).toUpperCase() === 'CLOSED';
}

function getKnowledgeLinks(issue) {
  return parseMetadataList(getMetadataField(issue.body || '', 'Knowledge Links'));
}

function isPullRequestNotFound(error) {
  return /not found|could not resolve to a pullrequest/i.test(error?.message || '');
}

export function getStatusLabel(status) {
  const normalized = normalizeLifecycleStatus(status);
  return normalized === 'closed' ? 'status:done' : `status:${normalized}`;
}

export function buildLifecycleEdit(issue, status) {
  const normalized = normalizeLifecycleStatus(status);
  const nextLabel = getStatusLabel(normalized);
  const labels = getLabelNames(issue);

  return {
    body: setMetadataField(issue.body || '', 'Status', normalized),
    addLabels: [nextLabel],
    removeLabels: labels.filter((label) => WORKFLOW_STATUS_LABELS.includes(label) && label !== nextLabel),
    state: normalized === 'closed' ? 'closed' : 'open',
  };
}

function buildPullRequestBody(story) {
  const knowledgeLinks = getKnowledgeLinks(story);
  let body = `## Summary
Implements ${story.title}

## Linked story
Refs #${story.number}`;

  if (knowledgeLinks.length) {
    body += `

## Knowledge context
${knowledgeLinks.map((link) => `- ${link}`).join('\n')}`;
  }

  return `${body}
`;
}

function normalizePullRequestBody(body = '') {
  return String(body).trimEnd();
}

function isManagedPullRequestBody(body, story) {
  const normalized = normalizePullRequestBody(body);
  const managedBodyPattern = new RegExp(
    `^## Summary\\nImplements story\\(#\\d+\\): [^\\n]+\\n\\n## Linked story\\nRefs #${String(story.number)}(?:\\n\\n## Knowledge context\\n(?:- .+\\n?)*)?$`,
  );

  return managedBodyPattern.test(normalized);
}

async function findStoryPullRequest(story, { backend }) {
  const linked = parsePullRequestReference(getMetadataField(story.body || '', 'Linked PR'));
  if (linked?.number) {
    try {
      return await backend.viewPullRequest(linked.number);
    } catch (error) {
      if (!isPullRequestNotFound(error)) {
        throw new Error(`Failed to load linked PR #${linked.number}: ${error.message}`);
      }
    }
  }

  const pullRequests = await backend.listPullRequests({
    state: 'open',
    search: `#${story.number}`,
  });

  return pullRequests.find((pullRequest) =>
    `${pullRequest.title}\n${pullRequest.body || ''}`.includes(`#${story.number}`)) || null;
}

async function syncPullRequestContext(story, pullRequest, { backend }) {
  const body = buildPullRequestBody(story);
  if (normalizePullRequestBody(pullRequest.body) === normalizePullRequestBody(body)) {
    return pullRequest;
  }
  if (!isManagedPullRequestBody(pullRequest.body, story)) {
    return pullRequest;
  }
  if (typeof backend.editPullRequest !== 'function') {
    throw new Error('The configured backend cannot sync pull request context because it does not implement editPullRequest().');
  }
  return backend.editPullRequest(pullRequest.number, { body });
}

export async function syncExistingStoryPullRequestContext(story, { backend = getBackend() } = {}) {
  const existing = await findStoryPullRequest(story, { backend });
  if (!existing) {
    return null;
  }
  return syncPullRequestContext(story, existing, { backend });
}

export async function ensureStoryPullRequest(story, { backend = getBackend(), base, head } = {}) {
  const existing = await findStoryPullRequest(story, { backend });
  if (existing) return syncPullRequestContext(story, existing, { backend });

  const branch = head || backend.getCurrentBranch();
  if (!branch) {
    throw new Error('Unable to determine the current branch for pull request creation. Please pass --head or run the command from a named git branch.');
  }

  return backend.createPullRequest({
    title: story.title,
    body: buildPullRequestBody(story),
    base,
    head: branch,
    draft: true,
  });
}

function mergeReviewerSources(reviewers = [], rootDir = process.cwd()) {
  const explicitReviewers = parseReviewerList(reviewers);
  if (explicitReviewers.length) {
    return explicitReviewers;
  }

  const envReviewers = parseReviewerList(process.env.GIT_TASKS_REVIEWERS || '');
  if (envReviewers.length) {
    return envReviewers;
  }

  const config = loadConfig(rootDir);
  if (config.defaultReviewers?.length) {
    return parseReviewerList(config.defaultReviewers);
  }

  return config.owner ? [config.owner] : [];
}

export async function applyStoryLifecycle(number, {
  status,
  reviewers = [],
  knowledgeLinks = [],
  base,
  head,
  backend = getBackend(),
  rootDir = process.cwd(),
} = {}) {
  const story = await backend.viewIssue(number);
  if (parseIssueTitle(story.title).type !== 'story') {
    throw new Error(`Issue #${number} is not a user story.`);
  }

  const normalizedStatus = normalizeLifecycleStatus(status);
  const reviewerList = normalizedStatus === 'ready-for-review'
    ? mergeReviewerSources(reviewers, rootDir)
    : [];
  if (normalizedStatus === 'ready-for-review' && !reviewerList.length) {
    throw new Error('Marking a story ready-for-review requires at least one reviewer. Pass --reviewer, set GIT_TASKS_REVIEWERS, or configure .git-tasks/config.json.');
  }

  const mergedKnowledgeLinks = knowledgeLinks.length
    ? parseMetadataList(getKnowledgeLinks(story), knowledgeLinks)
    : [];
  const storyForEdit = mergedKnowledgeLinks.length
    ? { ...story, body: setMetadataListField(story.body || '', 'Knowledge Links', mergedKnowledgeLinks) }
    : story;

  const edit = buildLifecycleEdit(storyForEdit, status);
  let pullRequest = null;

  if (edit.state === 'open' && normalizedStatus !== 'open') {
    pullRequest = await ensureStoryPullRequest(storyForEdit, { backend, base, head });
    edit.body = setMetadataField(edit.body, 'Linked PR', pullRequest.url);

    if (normalizedStatus === 'ready-for-review') {
      if (pullRequest.isDraft) {
        pullRequest = await backend.markPullRequestReady(pullRequest.number);
      }

      pullRequest = await backend.requestPullRequestReview(pullRequest.number, { reviewers: reviewerList });
    }
  }

  const updatedStory = await backend.editIssue(number, edit);
  const closedParents = normalizedStatus === 'closed'
    ? await cascadeCloseParentsFromIssue(updatedStory, 'story', { backend })
    : [];

  return { issue: updatedStory, pullRequest, closedParents };
}

export async function cascadeCloseParentsFromIssue(issueOrNumber, issueType, { backend = getBackend() } = {}) {
  const issue = typeof issueOrNumber === 'object'
    ? issueOrNumber
    : await backend.viewIssue(issueOrNumber);

  const config = CHILD_CONFIG[issueType];
  if (!config) return [];

  const parentNumber = getParentNumber(issue);
  if (!parentNumber) return [];

  const siblings = await backend.listIssues({ labels: [config.label], state: 'all' });
  const relatedSiblings = siblings.filter((candidate) => issueMatchesParent(candidate, parentNumber));
  if (!relatedSiblings.length || relatedSiblings.some((candidate) => !isClosed(candidate))) {
    return [];
  }

  const parentIssue = await backend.viewIssue(parentNumber);
  const closedParents = [];

  if (!isClosed(parentIssue)) {
    const updatedParent = await backend.editIssue(parentNumber, buildLifecycleEdit(parentIssue, 'closed'));
    closedParents.push(updatedParent);
  } else {
    closedParents.push(parentIssue);
  }

  return closedParents.concat(
    await cascadeCloseParentsFromIssue(parentIssue, config.parentType, { backend }),
  );
}
