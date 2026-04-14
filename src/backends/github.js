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

/**
 * Ensure a label exists in the repo; create it if missing.
 */
function ensureLabel(name, color, description) {
  try {
    runGh(['label', 'list', '--json', 'name', '--jq', `.[].name`]);
  } catch {
    // ignore
  }
  try {
    runGh(['label', 'create', name, '--color', color, '--description', description, '--force']);
  } catch {
    // label may already exist
  }
}

const LABEL_CONFIG = {
  'epic':       { color: '7B68EE', description: 'Epic issue' },
  'sprint':     { color: '4169E1', description: 'Sprint issue' },
  'user-story': { color: '3CB371', description: 'User story issue' },
};

function ensureLabels(labels) {
  for (const label of labels) {
    const cfg = LABEL_CONFIG[label] || { color: 'ededed', description: '' };
    ensureLabel(label, cfg.color, cfg.description);
  }
}

// ─── Issues ──────────────────────────────────────────────────────────────────

export function createIssue({ title, body, labels = [], assignees = [] }) {
  ensureLabels(labels);
  const args = ['issue', 'create', '--title', title, '--body', body];
  for (const l of labels) args.push('--label', l);
  for (const a of assignees) args.push('--assignee', a);
  args.push('--json', 'number,url,title');
  return runGhJSON(args);
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

// Export a unified backend object so backends are swappable.
const githubBackend = {
  createIssue,
  listIssues,
  viewIssue,
  editIssue,
};

export default githubBackend;
