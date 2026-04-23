import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'bin', 'git-tasks.js');
const REPO_ROOT = join(__dirname, '..');

function run(args, options = {}) {
  return spawnSync('node', [CLI, ...args], {
    encoding: 'utf8',
    cwd: options.cwd || REPO_ROOT,
    env: { ...process.env, ...(options.env || {}) },
  });
}

test('shows help with --help', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}\n${result.stderr}`);
  assert.ok(result.stdout.includes('git-tasks'), 'Expected program name in help');
  assert.ok(result.stdout.includes('epic'), 'Expected epic command in help');
  assert.ok(result.stdout.includes('init'), 'Expected init command in help');
  assert.ok(result.stdout.includes('skill'), 'Expected skill command in help');
  assert.ok(result.stdout.includes('sprint'), 'Expected sprint command in help');
  assert.ok(result.stdout.includes('story'), 'Expected story command in help');
  assert.ok(result.stdout.includes('overview'), 'Expected overview command in help');
  assert.ok(result.stdout.includes('wiki'), 'Expected wiki command in help');
});

test('epic --help shows subcommands', () => {
  const result = run(['epic', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

test('sprint --help shows subcommands', () => {
  const result = run(['sprint', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

test('story --help shows subcommands', () => {
  const result = run(['story', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

test('overview --help shows options', () => {
  const result = run(['overview', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--depth'));
  assert.ok(result.stdout.includes('--state'));
});

test('wiki --help shows subcommands', () => {
  const result = run(['wiki', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
});

test('init creates git-tasks-branded README content at git repo root', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-init-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  const result = run(['init'], { cwd });
  const readme = fs.readFileSync(join(cwd, 'wiki', 'README.md'), 'utf8');
  const rawReadme = fs.readFileSync(join(cwd, 'wiki', 'raw', 'README.md'), 'utf8');
  const processedReadme = fs.readFileSync(join(cwd, 'wiki', 'processed', 'README.md'), 'utf8');

  assert.equal(result.status, 0);
  assert.ok(readme.includes('managed by git-tasks'));
  assert.ok(readme.includes('wiki/raw/'));
  assert.ok(rawReadme.includes('unprocessed inputs'));
  assert.ok(processedReadme.includes('append-only'));
});

test('init fails outside a git repository root', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-init-invalid-'));
  const result = run(['init'], { cwd });

  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('git-tasks init must be run from the root of a git repository.'));
});

test('epic create --help shows options', () => {
  const result = run(['epic', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--description') || result.stdout.includes('-d'));
  assert.ok(result.stdout.includes('--points') || result.stdout.includes('-p'));
});

test('sprint create --help shows --epic option', () => {
  const result = run(['sprint', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
});

test('story create --help shows --sprint and --epic options', () => {
  const result = run(['story', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--sprint') || result.stdout.includes('-s'));
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
  assert.ok(result.stdout.includes('--priority'));
});

test('epic create requires explicit planning metadata', () => {
  const result = run(['epic', 'create', 'Ship auth', '-d', 'desc', '-p', '5', '--start', '2026-04-23']);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('--end'));
});

test('sprint create requires a parent epic', () => {
  const result = run(['sprint', 'create', 'Sprint 1', '-d', 'desc', '-p', '3', '--start', '2026-04-23', '--end', '2026-04-25']);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('--epic'));
});

test('story create requires sprint, epic, description, points, and priority', () => {
  const result = run(['story', 'create', 'Implement login', '-s', '7', '-e', '3', '-d', 'desc', '-p', '2']);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('--priority'));
});

test('story update --help shows lifecycle and reviewer options', () => {
  const result = run(['story', 'update', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('ready-for-review'));
  assert.ok(result.stdout.includes('--reviewer') || result.stdout.includes('-r'));
});

test('skill install copies canonical skill into requested targets', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-skill-'));
  try {
    const result = run(['skill', 'install', '--target', 'claude', '--target', 'copilot'], { cwd });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(join(cwd, '.claude', 'commands', 'git-tasks.md')));
    assert.ok(fs.existsSync(join(cwd, '.github', 'skills', 'git-tasks', 'SKILL.md')));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('skill install fails for unknown targets', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-skill-invalid-'));
  try {
    const result = run(['skill', 'install', '--target', 'unknown'], { cwd });

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Unknown skill target'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('package metadata targets the scoped npm package on Node.js 24+', async () => {
  const pkg = JSON.parse(fs.readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@atena-reply/git-tasks');
  assert.equal(pkg.bin['git-tasks'], 'bin/git-tasks.js');
  assert.equal(pkg.publishConfig.access, 'public');
  assert.equal(pkg.engines.node, '>=24');
});

test('agent skill is packaged in the installable repo layout', () => {
  const skillPath = join(REPO_ROOT, 'skills', 'git-tasks', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.match(skill, /^---\r?\nname: git-tasks\r?\ndescription:/);
  assert.ok(skill.includes('git-tasks overview --depth 2'));
  assert.ok(skill.includes('few hours to one day'));
  assert.ok(skill.includes('wiki/raw/'));
  assert.ok(skill.includes('append-only'));
  assert.ok(skill.includes('allowed-tools:'));
  assert.ok(skill.includes('hidden: true'));
});

test('wiki list warns with the renamed command when wiki is missing', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-list-'));
  const result = run(['wiki', 'list'], { cwd });

  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('Run: git-tasks init'));
});

test('wiki list shows nested raw and processed markdown files', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-list-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  run(['init'], { cwd });
  fs.writeFileSync(join(cwd, 'wiki', 'raw', 'meeting-notes.md'), '# Raw\n');
  fs.writeFileSync(join(cwd, 'wiki', 'processed', '2026-04-23T09-54-02Z-plan.md'), '# Processed\n');

  const result = run(['wiki', 'list'], { cwd });

  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('raw/meeting-notes.md'));
  assert.ok(result.stdout.includes('processed/2026-04-23T09-54-02Z-plan.md'));
});

test('wiki show rejects paths outside wiki/', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-show-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  run(['init'], { cwd });

  const result = run(['wiki', 'show', '../package'], { cwd });

  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('Wiki paths must stay inside the wiki/ directory.'));
});

test('parseIssueTitle correctly identifies epics', async () => {
  const { parseIssueTitle } = await import('../src/utils/format.js');
  const r = parseIssueTitle('epic: My Big Epic');
  assert.equal(r.type, 'epic');
  assert.equal(r.title, 'My Big Epic');
  assert.equal(r.ref, null);
});

test('parseIssueTitle correctly identifies sprints', async () => {
  const { parseIssueTitle } = await import('../src/utils/format.js');
  const r = parseIssueTitle('sprint(#5): Sprint One');
  assert.equal(r.type, 'sprint');
  assert.equal(r.ref, '#5');
  assert.equal(r.title, 'Sprint One');
});

test('parseIssueTitle correctly identifies user stories', async () => {
  const { parseIssueTitle } = await import('../src/utils/format.js');
  const r = parseIssueTitle('story(#12): As a user I want login');
  assert.equal(r.type, 'story');
  assert.equal(r.ref, '#12');
  assert.equal(r.title, 'As a user I want login');
});

test('parseIssueTitle returns unknown for unrecognized titles', async () => {
  const { parseIssueTitle } = await import('../src/utils/format.js');
  const r = parseIssueTitle('fix: some random thing');
  assert.equal(r.type, 'unknown');
  assert.equal(r.title, 'fix: some random thing');
});

test('format helpers and templates render expected project data', async () => {
  const {
    formatIssueList,
    formatIssueDetail,
    formatOverview,
    printInfo,
    printSuccess,
  } = await import('../src/utils/format.js');
  const { epicTemplate, sprintTemplate, storyTemplate } = await import('../src/utils/templates.js');

  const issue = {
    number: 1,
    title: 'epic: Authentication',
    state: 'OPEN',
    labels: [{ name: 'epic' }],
    assignees: [{ login: 'octocat' }],
    createdAt: '2026-01-02T03:04:05Z',
    updatedAt: '2026-01-03T03:04:05Z',
    url: 'https://example.com/issues/1',
    body: 'Body text',
    comments: {
      nodes: [{ author: { login: 'octocat' }, createdAt: '2026-01-04T03:04:05Z', body: 'Looks good' }],
    },
  };

  assert.ok(formatIssueList([issue], { short: true }).includes('#1'));
  assert.ok(formatIssueDetail(issue, { comments: true }).includes('Looks good'));
  assert.ok(formatOverview([{ ...issue, sprints: [{ number: 2, title: 'sprint(#1): Sprint 1', state: 'OPEN', stories: [{ number: 3, title: 'story(#2): Story', state: 'OPEN' }] }] }], { depth: 3 }).includes('#3'));
  assert.ok(epicTemplate({ description: 'Ship auth', points: 13 }).includes('Ship auth'));
  assert.ok(sprintTemplate({ epicNumber: 1, points: 5 }).includes('#1'));
  assert.ok(storyTemplate({ sprintNumber: 2, epicNumber: 1, priority: 'high' }).includes('Priority:** high'));
  assert.ok(storyTemplate({ sprintNumber: 2 }).includes('Linked PR'));

  const out = [];
  const originalLog = console.log;
  try {
    console.log = (msg) => out.push(String(msg));
    printInfo('info');
    printSuccess('done');
  } finally {
    console.log = originalLog;
  }
  assert.equal(out.length, 2);
  assert.ok(out[0].includes('info'));
  assert.ok(out[1].includes('done'));
});

test('metadata helpers normalize lifecycle status and reviewer lists', async () => {
  const {
    getMetadataField,
    normalizeLifecycleStatus,
    parseReviewerList,
    setMetadataField,
  } = await import('../src/utils/metadata.js');

  const body = setMetadataField('## Metadata\n- **Status:** open\n', 'Linked PR', 'https://example.com/pull/12');
  assert.equal(getMetadataField(body, 'Linked PR'), 'https://example.com/pull/12');
  assert.equal(normalizeLifecycleStatus('running'), 'in-progress');
  assert.equal(normalizeLifecycleStatus('ready'), 'ready-for-review');
  assert.deepEqual(parseReviewerList(['octocat,hubot', 'octocat']), ['octocat', 'hubot']);
});

test('applyStoryLifecycle requires reviewers before ready-for-review', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const backend = {
    async viewIssue() {
      return { number: 42, title: 'story(#7): Implement login', state: 'OPEN', body: '## Metadata\n- **Status:** open\n', labels: [{ name: 'user-story' }, { name: 'status:open' }] };
    },
  };

  await assert.rejects(
    applyStoryLifecycle(42, { status: 'ready-for-review', backend }),
    /requires at least one reviewer/,
  );
});

test('buildLifecycleEdit updates labels and state consistently', async () => {
  const { buildLifecycleEdit } = await import('../src/automation/lifecycle.js');
  const issue = {
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };

  const reviewEdit = buildLifecycleEdit(issue, 'ready-for-review');
  assert.equal(reviewEdit.state, 'open');
  assert.deepEqual(reviewEdit.addLabels, ['status:ready-for-review']);
  assert.deepEqual(reviewEdit.removeLabels, ['status:open']);
  assert.ok(reviewEdit.body.includes('ready-for-review'));

  const closedEdit = buildLifecycleEdit(issue, 'closed');
  assert.equal(closedEdit.state, 'closed');
  assert.deepEqual(closedEdit.addLabels, ['status:done']);
});

test('cascadeCloseParentsFromIssue closes sprint and epic when all children are done', async () => {
  const { cascadeCloseParentsFromIssue } = await import('../src/automation/lifecycle.js');

  const issues = new Map([
    [1, { number: 1, title: 'epic: Platform', state: 'OPEN', body: '## Metadata\n- **Status:** open\n', labels: [{ name: 'epic' }, { name: 'status:open' }] }],
    [2, { number: 2, title: 'sprint(#1): Sprint 1', state: 'OPEN', body: '## Metadata\n- **Status:** open\n', labels: [{ name: 'sprint' }, { name: 'status:open' }] }],
    [3, { number: 3, title: 'story(#2): Story A', state: 'CLOSED', body: '## Metadata\n- **Status:** closed\n', labels: [{ name: 'user-story' }, { name: 'status:done' }] }],
    [4, { number: 4, title: 'story(#2): Story B', state: 'CLOSED', body: '## Metadata\n- **Status:** closed\n', labels: [{ name: 'user-story' }, { name: 'status:done' }] }],
  ]);

  const backend = {
    async viewIssue(number) {
      return structuredClone(issues.get(Number(number)));
    },
    async listIssues({ labels }) {
      const wanted = new Set(labels);
      return [...issues.values()]
        .filter((issue) => issue.labels.some((label) => wanted.has(label.name || label)))
        .map((issue) => structuredClone(issue));
    },
    async editIssue(number, edits) {
      const current = issues.get(Number(number));
      const nextLabels = new Set(current.labels.map((label) => label.name || label));
      for (const label of edits.removeLabels || []) nextLabels.delete(label);
      for (const label of edits.addLabels || []) nextLabels.add(label);
      const updated = {
        ...current,
        body: edits.body ?? current.body,
        state: edits.state === 'closed' ? 'CLOSED' : current.state,
        labels: [...nextLabels].map((label) => ({ name: label })),
      };
      issues.set(Number(number), updated);
      return structuredClone(updated);
    },
  };

  const closedParents = await cascadeCloseParentsFromIssue(4, 'story', { backend });
  assert.deepEqual(closedParents.map((issue) => issue.number), [2, 1]);
  assert.equal(issues.get(2).state, 'CLOSED');
  assert.equal(issues.get(1).state, 'CLOSED');
});

test('epic create works with gh issue create stdout output and no unsupported json flag', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-gh-'));
  const ghLog = join(cwd, 'gh.log');
  const ghPath = join(cwd, 'gh');
  fs.writeFileSync(ghPath, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(ghLog)}, JSON.stringify(args) + '\\n');
if (args[0] === 'label' && args[1] === 'list') process.exit(0);
if (args[0] === 'label' && args[1] === 'create') process.exit(0);
if (args[0] === 'issue' && args[1] === 'create') {
  if (args.includes('--json')) {
    console.error('unknown flag: --json');
    process.exit(1);
  }
  process.stdout.write('https://github.com/Atena-IT/git-tasks/issues/123\\n');
  process.exit(0);
}
if (args[0] === 'issue' && args[1] === 'view') {
  process.stdout.write(JSON.stringify({
    number: 123,
    url: 'https://github.com/Atena-IT/git-tasks/issues/123',
    title: 'epic: Ship auth',
    state: 'OPEN',
    body: 'Test body',
    labels: [{ name: 'epic' }, { name: 'status:open' }],
    assignees: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }));
  process.exit(0);
}
console.error('Unexpected gh invocation: ' + args.join(' '));
process.exit(1);
`);
  fs.chmodSync(ghPath, 0o755);

  try {
    const result = run(['epic', 'create', 'Ship auth', '-d', 'Test body', '-p', '3', '--start', '2026-01-01', '--end', '2026-01-14'], {
      cwd,
      env: { PATH: `${cwd}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('Created epic #123: https://github.com/Atena-IT/git-tasks/issues/123'));

    const commands = fs.readFileSync(ghLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const issueCreate = commands.find((args) => args[0] === 'issue' && args[1] === 'create');
    const issueView = commands.find((args) => args[0] === 'issue' && args[1] === 'view');

    assert.ok(issueCreate, 'expected gh issue create to be called');
    assert.ok(issueView, 'expected gh issue view to be called');
    assert.ok(!issueCreate.includes('--json'), 'gh issue create should not receive --json');
    assert.deepEqual(issueView, ['issue', 'view', '123', '--json', 'number,title,state,body,labels,assignees,createdAt,updatedAt,url']);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
