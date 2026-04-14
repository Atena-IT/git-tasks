import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'bin', 'git-planner.js');

function run(...args) {
  return spawnSync('node', [CLI, ...args], { encoding: 'utf8' });
}

// ─── Help output ──────────────────────────────────────────────────────────────

test('shows help with --help', () => {
  const result = run('--help');
  assert.equal(result.status, 0, `Expected exit 0, got ${result.status}\n${result.stderr}`);
  assert.ok(result.stdout.includes('git-planner'), 'Expected program name in help');
  assert.ok(result.stdout.includes('epic'), 'Expected epic command in help');
  assert.ok(result.stdout.includes('sprint'), 'Expected sprint command in help');
  assert.ok(result.stdout.includes('story'), 'Expected story command in help');
  assert.ok(result.stdout.includes('overview'), 'Expected overview command in help');
  assert.ok(result.stdout.includes('wiki'), 'Expected wiki command in help');
});

test('epic --help shows subcommands', () => {
  const result = run('epic', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'), 'Expected create subcommand');
  assert.ok(result.stdout.includes('list'), 'Expected list subcommand');
  assert.ok(result.stdout.includes('show'), 'Expected show subcommand');
  assert.ok(result.stdout.includes('update'), 'Expected update subcommand');
});

test('sprint --help shows subcommands', () => {
  const result = run('sprint', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

test('story --help shows subcommands', () => {
  const result = run('story', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

test('overview --help shows options', () => {
  const result = run('overview', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--depth'));
  assert.ok(result.stdout.includes('--state'));
});

test('wiki --help shows subcommands', () => {
  const result = run('wiki', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('init'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('show'));
});

// ─── Subcommand help ──────────────────────────────────────────────────────────

test('epic create --help shows options', () => {
  const result = run('epic', 'create', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--description') || result.stdout.includes('-d'));
  assert.ok(result.stdout.includes('--points') || result.stdout.includes('-p'));
});

test('sprint create --help shows --epic option', () => {
  const result = run('sprint', 'create', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
});

test('story create --help shows --sprint and --epic options', () => {
  const result = run('story', 'create', '--help');
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--sprint') || result.stdout.includes('-s'));
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
  assert.ok(result.stdout.includes('--priority'));
});

// ─── Title parsing ────────────────────────────────────────────────────────────

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
