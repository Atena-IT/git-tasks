import getBackend from '../backends/index.js';
import { parseIssueTitle } from '../utils/format.js';
import {
  getMetadataField,
  normalizeLifecycleStatus,
  parsePullRequestReference,
  parseReviewerList,
  setMetadataField,
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
  return `## Summary
Implements ${story.title}

## Linked story
Refs #${story.number}
`;
}

async function findStoryPullRequest(story, { backend }) {
  const linked = parsePullRequestReference(getMetadataField(story.body || '', 'Linked PR'));
  if (linked?.number) {
    try {
      return await backend.viewPullRequest(linked.number);
    } catch {
      // fall back to search
    }
  }

  const pullRequests = await backend.listPullRequests({
    state: 'open',
    search: `#${story.number}`,
  });

  return pullRequests.find((pullRequest) =>
    `${pullRequest.title}\n${pullRequest.body || ''}`.includes(`#${story.number}`)) || null;
}

export async function ensureStoryPullRequest(story, { backend = getBackend(), base, head } = {}) {
  const existing = await findStoryPullRequest(story, { backend });
  if (existing) return existing;

  const branch = head || backend.getCurrentBranch();
  if (!branch) {
    throw new Error('Unable to determine the current branch for pull request creation.');
  }

  return backend.createPullRequest({
    title: story.title,
    body: buildPullRequestBody(story),
    base,
    head: branch,
    draft: true,
  });
}

function getReviewers(reviewers = []) {
  const envReviewers = process.env.GIT_TASKS_REVIEWERS || '';
  return parseReviewerList(reviewers, envReviewers);
}

export async function applyStoryLifecycle(number, { status, reviewers = [], base, head, backend = getBackend() } = {}) {
  const story = await backend.viewIssue(number);
  if (parseIssueTitle(story.title).type !== 'story') {
    throw new Error(`Issue #${number} is not a user story.`);
  }

  const edit = buildLifecycleEdit(story, status);
  let pullRequest = null;

  if (edit.state === 'open' && normalizeLifecycleStatus(status) !== 'open') {
    pullRequest = await ensureStoryPullRequest(story, { backend, base, head });
    edit.body = setMetadataField(edit.body, 'Linked PR', pullRequest.url);

    if (normalizeLifecycleStatus(status) === 'ready-for-review') {
      if (pullRequest.isDraft) {
        pullRequest = await backend.markPullRequestReady(pullRequest.number);
      }

      const reviewerList = getReviewers(reviewers);
      if (reviewerList.length) {
        pullRequest = await backend.requestPullRequestReview(pullRequest.number, { reviewers: reviewerList });
      }
    }
  }

  const updatedStory = await backend.editIssue(number, edit);
  const closedParents = normalizeLifecycleStatus(status) === 'closed'
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
