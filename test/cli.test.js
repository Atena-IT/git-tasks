import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'bin', 'geet-tasks.js');
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
  assert.ok(result.stdout.includes('geet-tasks'), 'Expected program name in help');
  assert.ok(result.stdout.includes('epic'), 'Expected epic command in help');
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
  assert.ok(result.stdout.includes('init'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
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

test('package metadata targets geet-tasks on Node.js 24+', async () => {
  const pkg = JSON.parse(fs.readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'geet-tasks');
  assert.equal(pkg.bin['geet-tasks'], './bin/geet-tasks.js');
  assert.equal(pkg.engines.node, '>=24');
});

test('agent skill is packaged in the installable repo layout', () => {
  const skillPath = join(REPO_ROOT, 'skills', 'geet-tasks', 'SKILL.md');
  const versionedSkillPath = join(REPO_ROOT, 'skills', 'geet-tasks', 'v1', 'usage.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const versionedSkill = fs.readFileSync(versionedSkillPath, 'utf8');

  assert.match(skill, /^---\nname: geet-tasks\ndescription:/);
  assert.ok(skill.includes('geet-tasks overview --depth 2'));
  assert.equal(versionedSkill, skill);
});

test('wiki init creates geet-tasks-branded README content', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'geet-tasks-wiki-'));
  const result = run(['wiki', 'init'], { cwd });
  const readme = fs.readFileSync(join(cwd, 'wiki', 'README.md'), 'utf8');

  assert.equal(result.status, 0);
  assert.ok(readme.includes('managed by geet-tasks'));
  assert.ok(readme.includes('geet-tasks wiki list'));
});

test('wiki list warns with the renamed command when wiki is missing', () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'geet-tasks-list-'));
  const result = run(['wiki', 'list'], { cwd });

  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('Run: geet-tasks wiki init'));
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
  const r = parseIssueTitle('us(#12): As a user I want login');
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
  assert.ok(formatOverview([{ ...issue, sprints: [{ number: 2, title: 'sprint(#1): Sprint 1', state: 'OPEN', stories: [{ number: 3, title: 'us(#2): Story', state: 'OPEN' }] }] }], { depth: 3 }).includes('#3'));
  assert.ok(epicTemplate({ description: 'Ship auth', points: 13 }).includes('Ship auth'));
  assert.ok(sprintTemplate({ epicNumber: 1, points: 5 }).includes('#1'));
  assert.ok(storyTemplate({ sprintNumber: 2, epicNumber: 1, priority: 'high' }).includes('Priority:** high'));

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
