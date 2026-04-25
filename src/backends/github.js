import { spawnSync } from 'child_process';

/**
 * GitHub backend — wraps the `gh` CLI.
 * All methods return plain JS objects.
 */

function runGh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error('`gh` CLI not found. Install it from https://cli.github.com/');
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `gh exited with status ${result.status}`);
  }
  return result.stdout?.trim() || '';
}

function runGhJSON(args) {
  const out = runGh(args);
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`Failed to parse gh output as JSON:\n${out}`);
  }
}

function extractIssueNumberFromOutput(output) {
  const match = output.match(/\/issues\/(\d+)(?:\/|$)/);
  if (!match) {
    throw new Error(`Failed to determine issue number from output:\n${output}`);
  }
  return match[1];
}

function listExistingLabels() {
  try {
    const labels = runGhJSON(['label', 'list', '--json', 'name']);
    return new Set(labels.map((label) => label.name));
  } catch {
    return null;
  }
}

/**
 * Ensure a label exists in the repo; create it if missing.
 */
function ensureLabel(name, color, description) {
  try {
    runGh(['label', 'create', name, '--color', color, '--description', description, '--force']);
    return true;
  } catch {
    return false;
  }
}

const LABEL_CONFIG = {
  'epic':                    { color: '7B68EE', description: 'Epic issue' },
  'sprint':                  { color: '4169E1', description: 'Sprint issue' },
  'user-story':              { color: '3CB371', description: 'User story issue' },
  'status:open':             { color: 'D4C5F9', description: 'Workflow status: open' },
  'status:in-progress':      { color: 'FBCA04', description: 'Workflow status: in progress' },
  'status:ready-for-review': { color: '0E8A16', description: 'Workflow status: ready for review' },
  'status:done':             { color: '5319E7', description: 'Workflow status: done' },
};

function ensureLabels(labels) {
  const existingLabels = listExistingLabels();
  const ensuredLabels = [];
  for (const label of labels) {
    if (existingLabels?.has(label)) {
      ensuredLabels.push(label);
      continue;
    }
    const cfg = LABEL_CONFIG[label] || { color: 'ededed', description: '' };
    if (ensureLabel(label, cfg.color, cfg.description)) {
      ensuredLabels.push(label);
    }
  }
  return ensuredLabels;
}

// ─── Issues ──────────────────────────────────────────────────────────────────

export function createIssue({ title, body, labels = [], assignees = [] }) {
  const ensuredLabels = ensureLabels(labels);
  const args = ['issue', 'create', '--title', title, '--body', body];
  for (const l of ensuredLabels) args.push('--label', l);
  for (const a of assignees) args.push('--assignee', a);

  const output = runGh(args);
  return viewIssue(extractIssueNumberFromOutput(output));
}

export function listIssues({ labels = [], state = 'open', limit = 100 } = {}) {
  const stateFlag = state === 'all' ? 'all' : state === 'closed' ? 'closed' : 'open';
  const args = [
    'issue', 'list',
    '--state', stateFlag,
    '--limit', String(limit),
    '--json', 'number,title,state,labels,assignees,createdAt,url',
  ];
  for (const l of labels) args.push('--label', l);
  return runGhJSON(args);
}

export function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Unable to determine the current git branch.');
  }
  return result.stdout?.trim() || '';
}

export function viewIssue(number, { comments = false } = {}) {
  const fields = 'number,title,state,body,labels,assignees,createdAt,updatedAt,url';
  const fieldsWithComments = comments ? fields + ',comments' : fields;
  const args = ['issue', 'view', String(number), '--json', fieldsWithComments];
  return runGhJSON(args);
}

export function editIssue(number, { title, body, addLabels = [], removeLabels = [], addAssignees = [], state } = {}) {
  const args = ['issue', 'edit', String(number)];
  if (title) args.push('--title', title);
  if (body !== undefined) args.push('--body', body);
  for (const l of addLabels) args.push('--add-label', l);
  for (const l of removeLabels) args.push('--remove-label', l);
  for (const a of addAssignees) args.push('--add-assignee', a);
  runGh(args);

  if (state === 'closed') {
    runGh(['issue', 'close', String(number)]);
  } else if (state === 'open') {
    runGh(['issue', 'reopen', String(number)]);
  }

  return viewIssue(number);
}

export function listPullRequests({ state = 'open', base, head, search } = {}) {
  const args = [
    'pr', 'list',
    '--state', state,
    '--json', 'number,url,title,body,isDraft,state,headRefName,baseRefName',
  ];
  if (base) args.push('--base', base);
  if (head) args.push('--head', head);
  if (search) args.push('--search', search);
  return runGhJSON(args);
}

export function viewPullRequest(number) {
  return runGhJSON([
    'pr', 'view', String(number),
    '--json', 'number,url,title,body,isDraft,state,headRefName,baseRefName',
  ]);
}

export function createPullRequest({ title, body, base, head, draft = false }) {
  const args = ['pr', 'create', '--title', title, '--body', body];
  if (draft) args.push('--draft');
  if (base) args.push('--base', base);
  if (head) args.push('--head', head);

  const output = runGh(args);
  const match = output.match(/\/pull\/(\d+)(?:\/?|$)/);
  if (!match) {
    throw new Error(`Failed to determine pull request number from output:\n${output}`);
  }
  return viewPullRequest(match[1]);
}

export function editPullRequest(number, { title, body, base } = {}) {
  const args = ['pr', 'edit', String(number)];
  if (title) args.push('--title', title);
  if (body !== undefined) args.push('--body', body);
  if (base) args.push('--base', base);
  runGh(args);
  return viewPullRequest(number);
}

export function markPullRequestReady(number) {
  runGh(['pr', 'ready', String(number)]);
  return viewPullRequest(number);
}

export function requestPullRequestReview(number, { reviewers = [] } = {}) {
  const args = ['pr', 'edit', String(number)];
  for (const reviewer of reviewers) {
    args.push('--add-reviewer', reviewer);
  }
  runGh(args);
  return viewPullRequest(number);
}

// Export a unified backend object so backends are swappable.
const githubBackend = {
  createIssue,
  listIssues,
  getCurrentBranch,
  viewIssue,
  editIssue,
  listPullRequests,
  viewPullRequest,
  createPullRequest,
  editPullRequest,
  markPullRequestReady,
  requestPullRequestReview,
};

export default githubBackend;
