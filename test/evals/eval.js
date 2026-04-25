import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CLI = join(REPO_ROOT, 'bin', 'git-tasks.js');
const SKILL_PATH = join(REPO_ROOT, 'skills', 'git-tasks', 'SKILL.md');
const EVALS_PATH = join(REPO_ROOT, 'test', 'evals', 'git-tasks.evals.json');

function run(args, options = {}) {
  return spawnSync('node', [CLI, ...args], {
    encoding: 'utf8',
    cwd: options.cwd || REPO_ROOT,
    env: { ...process.env, ...(options.env || {}) },
  });
}

test('eval harness smoke-tests repo bootstrap and wiki knowledge flow', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-eval-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    const initResult = run(['init', '--owner', 'octocat', '--reviewer', 'hubot'], { cwd });
    assert.equal(initResult.status, 0, initResult.stderr);

    const config = JSON.parse(fs.readFileSync(join(cwd, '.git-tasks', 'config.json'), 'utf8'));
    assert.equal(config.owner, 'octocat');
    assert.deepEqual(config.defaultReviewers, ['hubot']);
    assert.deepEqual(config.planningHorizons, {
      storyMaxDays: 1,
      sprintMaxDays: 3,
      epicMaxWeeks: 2,
    });

    const inboxFixture = fs.readFileSync(join(REPO_ROOT, 'test', 'evals', 'fixtures', 'raw-meeting-notes.md'), 'utf8');
    const knowledgeFixture = fs.readFileSync(join(REPO_ROOT, 'test', 'evals', 'fixtures', 'knowledge-auth-plan.md'), 'utf8');
    fs.writeFileSync(join(cwd, 'wiki', 'inbox', 'meeting-notes.md'), inboxFixture);
    fs.writeFileSync(join(cwd, 'wiki', 'knowledge', 'auth-plan.md'), knowledgeFixture, 'utf8');
    fs.appendFileSync(
      join(cwd, 'wiki', 'knowledge', 'index.md'),
      '- `2026-04-23T09:54:02Z | decision | [Split auth rollout into reviewable stories](auth-plan.md) — Break the auth work into agent-sized stories with clear review handoff.`\n',
      'utf8',
    );

    const listResult = run(['wiki', 'list'], { cwd });
    assert.equal(listResult.status, 0, listResult.stderr);
    assert.ok(listResult.stdout.includes('inbox/meeting-notes.md'));
    assert.ok(listResult.stdout.includes('knowledge/index.md'));
    assert.ok(listResult.stdout.includes('knowledge/auth-plan.md'));

    const showResult = run(['wiki', 'show', 'knowledge/index'], { cwd });
    assert.equal(showResult.status, 0, showResult.stderr);
    assert.ok(showResult.stdout.includes('Knowledge Index'));
    assert.ok(showResult.stdout.includes('decision'));
    assert.ok(showResult.stdout.includes('auth-plan.md'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('shipped skill documents repo config, knowledge index, and lifecycle boundaries', () => {
  const skill = fs.readFileSync(SKILL_PATH, 'utf8');

  assert.ok(skill.includes('.git-tasks/config.json'));
  assert.ok(skill.includes('planningHorizons'));
  assert.ok(skill.includes('defaultReviewers'));
  assert.ok(skill.includes('owner'));
  assert.ok(skill.includes('wiki/inbox/'));
  assert.ok(skill.includes('wiki/knowledge/index.md'));
  assert.ok(skill.includes('timestamp'));
  assert.ok(skill.includes('neighbours'));
  assert.ok(skill.includes('issue-refs'));
  assert.ok(skill.includes('does **not** justify creating or updating issues, branches, or pull requests'));
  assert.ok(skill.includes('draft PR'));
  assert.ok(skill.includes('Knowledge Links'));
});

test('skill eval set covers knowledge/index flow, no-CRUD cases, and reviewer fallback', () => {
  const evalSet = JSON.parse(fs.readFileSync(EVALS_PATH, 'utf8'));

  assert.equal(evalSet.skill_name, 'git-tasks');
  assert.ok(evalSet.evals.length >= 4);

  for (const entry of evalSet.evals) {
    assert.ok(entry.id, 'expected eval id');
    assert.ok(entry.prompt?.trim(), 'expected eval prompt');
    assert.ok(entry.expected_output?.trim(), 'expected expected_output text');
    for (const relativeFile of entry.files || []) {
      assert.ok(fs.existsSync(join(REPO_ROOT, relativeFile)), `missing eval fixture: ${relativeFile}`);
    }
  }

  assert.ok(evalSet.evals.some((entry) => /knowledge\/index/i.test(entry.prompt)));
  assert.ok(evalSet.evals.some((entry) => /issue, branch, and pull-request CRUD|no planning delta/i.test(entry.expected_output)));
  assert.ok(evalSet.evals.some((entry) => /defaultReviewers|owner|config\.json/i.test(entry.expected_output)));
  assert.ok(evalSet.evals.some((entry) => /legacy raw\/processed|write forward|inbox\/knowledge/i.test(entry.expected_output)));
});
