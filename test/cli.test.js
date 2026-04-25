import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, win32 } from 'path';
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

test('init creates git-tasks-branded inbox and knowledge wiki content at git repo root', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-init-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    const result = run(['init'], { cwd });
    const readme = fs.readFileSync(join(cwd, 'wiki', 'README.md'), 'utf8');
    const inboxReadme = fs.readFileSync(join(cwd, 'wiki', 'inbox', 'README.md'), 'utf8');
    const knowledgeReadme = fs.readFileSync(join(cwd, 'wiki', 'knowledge', 'README.md'), 'utf8');
    const knowledgeIndex = fs.readFileSync(join(cwd, 'wiki', 'knowledge', 'index.md'), 'utf8');

    assert.equal(result.status, 0);
    assert.ok(readme.includes('managed by git-tasks'));
    assert.ok(readme.includes('wiki/inbox/'));
    assert.ok(readme.includes('wiki/knowledge/index.md'));
    assert.ok(inboxReadme.includes('unmodified incoming material'));
    assert.ok(knowledgeReadme.includes('durable knowledge nodes'));
    assert.ok(knowledgeReadme.includes('dash-case frontmatter'));
    assert.ok(knowledgeIndex.includes('Knowledge Index'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('init fails outside a git repository root', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-init-invalid-'));

  try {
    const result = run(['init'], { cwd });

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('git-tasks init must be run from the root of a git repository.'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('init --help shows owner and reviewer options', () => {
  const result = run(['init', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--owner'));
  assert.ok(result.stdout.includes('--reviewer') || result.stdout.includes('-r'));
});

test('init creates repo config with owner, reviewers, and planning horizons', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-config-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    const result = run(['init', '--owner', 'octocat', '--reviewer', 'hubot', '--reviewer', 'octocat'], { cwd });
    const config = JSON.parse(fs.readFileSync(join(cwd, '.git-tasks', 'config.json'), 'utf8'));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(config.owner, 'octocat');
    assert.deepEqual(config.defaultReviewers, ['hubot', 'octocat']);
    assert.deepEqual(config.planningHorizons, {
      storyMaxDays: 1,
      sprintMaxDays: 3,
      epicMaxWeeks: 2,
    });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('init keeps existing config unchanged when rerun without flags', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-config-idempotent-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    run(['init', '--owner', 'octocat', '--reviewer', 'hubot'], { cwd });

    const configPath = join(cwd, '.git-tasks', 'config.json');
    const before = fs.readFileSync(configPath, 'utf8');
    const result = run(['init'], { cwd });
    const after = fs.readFileSync(configPath, 'utf8');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(after, before);
    assert.ok(result.stdout.includes('already initialized'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('init updates existing config when new reviewer flags are passed', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-config-update-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    run(['init', '--owner', 'octocat', '--reviewer', 'hubot'], { cwd });

    const result = run(['init', '--reviewer', 'mona'], { cwd });
    const config = JSON.parse(fs.readFileSync(join(cwd, '.git-tasks', 'config.json'), 'utf8'));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(config.owner, 'octocat');
    assert.deepEqual(config.defaultReviewers, ['hubot', 'mona']);
    assert.ok(result.stdout.includes('Updated git-tasks config'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('epic create --help shows planning and knowledge options', () => {
  const result = run(['epic', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--description') || result.stdout.includes('-d'));
  assert.ok(result.stdout.includes('--points') || result.stdout.includes('-p'));
  assert.ok(result.stdout.includes('--knowledge') || result.stdout.includes('-k'));
});

test('sprint create --help shows --epic and --knowledge options', () => {
  const result = run(['sprint', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
  assert.ok(result.stdout.includes('--knowledge') || result.stdout.includes('-k'));
});

test('story create --help shows sprint, epic, priority, and knowledge options', () => {
  const result = run(['story', 'create', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--sprint') || result.stdout.includes('-s'));
  assert.ok(result.stdout.includes('--epic') || result.stdout.includes('-e'));
  assert.ok(result.stdout.includes('--priority'));
  assert.ok(result.stdout.includes('--knowledge') || result.stdout.includes('-k'));
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

test('story update --help shows lifecycle, reviewer, and knowledge options', () => {
  const result = run(['story', 'update', '--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('ready-for-review'));
  assert.ok(result.stdout.includes('--reviewer') || result.stdout.includes('-r'));
  assert.ok(result.stdout.includes('--knowledge') || result.stdout.includes('-k'));
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
  assert.ok(skill.includes('wiki/inbox/'));
  assert.ok(skill.includes('wiki/knowledge/index.md'));
  assert.ok(skill.includes('Knowledge Links'));
  assert.ok(skill.includes('allowed-tools:'));
  assert.ok(skill.includes('hidden: true'));
  assert.equal(fs.existsSync(join(REPO_ROOT, 'skills', 'git-tasks', 'evals', 'evals.json')), false);
  assert.equal(fs.existsSync(join(REPO_ROOT, 'skills', 'git-tasks-workspace')), false);
  assert.equal(fs.existsSync(join(REPO_ROOT, 'test', 'evals', 'git-tasks.evals.json')), true);
});

test('wiki list warns with the renamed command when wiki is missing', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-list-'));

  try {
    const result = run(['wiki', 'list'], { cwd });

    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('Run: git-tasks init'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('wiki list shows nested inbox and knowledge markdown files', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-list-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    run(['init'], { cwd });
    fs.writeFileSync(join(cwd, 'wiki', 'inbox', 'meeting-notes.md'), '# Inbox\n');
    fs.writeFileSync(join(cwd, 'wiki', 'knowledge', 'auth-plan.md'), '# Knowledge\n');

    const result = run(['wiki', 'list'], { cwd });

    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('inbox/meeting-notes.md'));
    assert.ok(result.stdout.includes('knowledge/index.md'));
    assert.ok(result.stdout.includes('knowledge/auth-plan.md'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('wiki show rejects paths outside wiki/', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-show-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });

  try {
    run(['init'], { cwd });

    const result = run(['wiki', 'show', '../package'], { cwd });

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Wiki paths must stay inside the wiki/ directory.'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('wiki show rejects symlink escapes outside wiki/', { skip: process.platform === 'win32' }, async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-link-'));
  const outsideDir = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-wiki-outside-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  fs.writeFileSync(join(outsideDir, 'secret.md'), '# Secret\n');

  try {
    run(['init'], { cwd });
    await rm(join(cwd, 'wiki', 'knowledge'), { recursive: true, force: true });
    fs.symlinkSync(outsideDir, join(cwd, 'wiki', 'knowledge'));

    const result = run(['wiki', 'show', 'knowledge/secret'], { cwd });

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Wiki paths must stay inside the wiki/ directory.'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  }
});

test('isWikiPathWithinRoot rejects win32 cross-drive paths', async () => {
  const { isWikiPathWithinRoot } = await import('../src/commands/wiki.js');

  assert.equal(
    isWikiPathWithinRoot('C:\\repo\\wiki', 'D:\\tmp\\note.md', win32),
    false,
  );
  assert.equal(
    isWikiPathWithinRoot('C:\\repo\\wiki', 'C:\\repo\\wiki\\knowledge\\index.md', win32),
    true,
  );
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
  assert.ok(epicTemplate({ knowledgeLinks: ['wiki/knowledge/auth-plan.md'] }).includes('Knowledge Links:** wiki/knowledge/auth-plan.md'));
  assert.ok(sprintTemplate({ epicNumber: 1, points: 5 }).includes('#1'));
  assert.ok(storyTemplate({ sprintNumber: 2, epicNumber: 1, priority: 'high' }).includes('Priority:** high'));
  assert.ok(storyTemplate({ knowledgeLinks: ['wiki/knowledge/auth-plan.md'] }).includes('Knowledge Links:** wiki/knowledge/auth-plan.md'));
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

test('metadata helpers normalize lifecycle status, reviewers, and knowledge links', async () => {
  const {
    getMetadataField,
    normalizeLifecycleStatus,
    parseMetadataList,
    parseReviewerList,
    setMetadataField,
    setMetadataListField,
  } = await import('../src/utils/metadata.js');

  const body = setMetadataField('## Metadata\n- **Status:** open\n', 'Linked PR', 'https://example.com/pull/12');
  const withKnowledge = setMetadataListField(body, 'Knowledge Links', ['wiki/knowledge/auth-plan.md', 'wiki/knowledge/auth-plan.md', 'wiki/knowledge/sso-plan.md']);
  assert.equal(getMetadataField(body, 'Linked PR'), 'https://example.com/pull/12');
  assert.equal(getMetadataField(withKnowledge, 'Knowledge Links'), 'wiki/knowledge/auth-plan.md, wiki/knowledge/sso-plan.md');
  assert.equal(normalizeLifecycleStatus('running'), 'in-progress');
  assert.equal(normalizeLifecycleStatus('ready'), 'ready-for-review');
  assert.deepEqual(parseReviewerList(['octocat,hubot', 'octocat']), ['octocat', 'hubot']);
  assert.deepEqual(parseMetadataList([null, 'wiki/knowledge/auth-plan.md, wiki/knowledge/sso-plan.md']), ['wiki/knowledge/auth-plan.md', 'wiki/knowledge/sso-plan.md']);
});

test('config helpers return defaults when the repo config is missing', async () => {
  const { loadConfig } = await import('../src/utils/config.js');
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-config-defaults-'));

  try {
    assert.deepEqual(loadConfig(cwd), {
      owner: '',
      defaultReviewers: [],
      planningHorizons: {
        storyMaxDays: 1,
        sprintMaxDays: 3,
        epicMaxWeeks: 2,
      },
    });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
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

test('applyStoryLifecycle falls back to repo owner when config reviewers are not set', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const { saveConfig } = await import('../src/utils/config.js');
  const rootDir = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-review-owner-'));
  saveConfig({ owner: 'octocat' }, rootDir);

  try {
    const story = {
      number: 42,
      title: 'story(#7): Implement login',
      state: 'OPEN',
      body: '## Metadata\n- **Status:** open\n',
      labels: [{ name: 'user-story' }, { name: 'status:open' }],
    };
    const basePullRequest = {
      number: 88,
      title: story.title,
      body: 'Refs #42',
      url: 'https://example.com/pull/88',
      isDraft: true,
    };
    let requestedReviewers = [];
    let markedReady = false;

    const backend = {
      async viewIssue() {
        return structuredClone(story);
      },
      async listPullRequests() {
        return [structuredClone(basePullRequest)];
      },
      async markPullRequestReady() {
        markedReady = true;
        return { ...basePullRequest, isDraft: false };
      },
      async requestPullRequestReview(number, { reviewers }) {
        requestedReviewers = reviewers;
        return { ...basePullRequest, number, isDraft: false };
      },
      async editIssue(number, edits) {
        return {
          ...story,
          number,
          body: edits.body,
          state: 'OPEN',
          labels: [{ name: 'user-story' }, { name: 'status:ready-for-review' }],
        };
      },
    };

    const { pullRequest } = await applyStoryLifecycle(42, {
      status: 'ready-for-review',
      backend,
      rootDir,
    });

    assert.equal(markedReady, true);
    assert.deepEqual(requestedReviewers, ['octocat']);
    assert.equal(pullRequest.number, 88);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('applyStoryLifecycle prefers explicit reviewers, then env reviewers, before repo config', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const { saveConfig } = await import('../src/utils/config.js');
  const rootDir = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-review-precedence-'));
  const previousEnvReviewers = process.env.GIT_TASKS_REVIEWERS;
  saveConfig({ owner: 'octocat', defaultReviewers: ['config-reviewer'] }, rootDir);
  process.env.GIT_TASKS_REVIEWERS = 'env-reviewer';

  const story = {
    number: 42,
    title: 'story(#7): Implement login',
    state: 'OPEN',
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };
  const basePullRequest = {
    number: 88,
    title: story.title,
    body: 'Refs #42',
    url: 'https://example.com/pull/88',
    isDraft: true,
  };
  let requestedReviewers = [];

  const backend = {
    async viewIssue() {
      return structuredClone(story);
    },
    async listPullRequests() {
      return [structuredClone(basePullRequest)];
    },
    async markPullRequestReady() {
      return { ...basePullRequest, isDraft: false };
    },
    async requestPullRequestReview(number, { reviewers }) {
      requestedReviewers = reviewers;
      return { ...basePullRequest, number, isDraft: false };
    },
    async editIssue(number, edits) {
      return {
        ...story,
        number,
        body: edits.body,
        state: 'OPEN',
        labels: [{ name: 'user-story' }, { name: 'status:ready-for-review' }],
      };
    },
  };

  try {
    await applyStoryLifecycle(42, {
      status: 'ready-for-review',
      reviewers: ['cli-reviewer'],
      backend,
      rootDir,
    });
    assert.deepEqual(requestedReviewers, ['cli-reviewer']);

    requestedReviewers = [];
    await applyStoryLifecycle(42, {
      status: 'ready-for-review',
      backend,
      rootDir,
    });
    assert.deepEqual(requestedReviewers, ['env-reviewer']);
  } finally {
    if (previousEnvReviewers === undefined) {
      delete process.env.GIT_TASKS_REVIEWERS;
    } else {
      process.env.GIT_TASKS_REVIEWERS = previousEnvReviewers;
    }
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('applyStoryLifecycle syncs knowledge links into an existing story PR', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const story = {
    number: 42,
    title: 'story(#7): Implement login',
    state: 'OPEN',
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };
  const basePullRequest = {
    number: 88,
    title: story.title,
    body: `## Summary\nImplements ${story.title}\n\n## Linked story\nRefs #${story.number}\n`,
    url: 'https://example.com/pull/88',
    isDraft: true,
  };
  let createdPullRequest = false;
  let editedPullRequestBody = '';

  const backend = {
    async viewIssue() {
      return structuredClone(story);
    },
    async listPullRequests() {
      return [structuredClone(basePullRequest)];
    },
    async createPullRequest() {
      createdPullRequest = true;
      throw new Error('createPullRequest should not be called when a matching PR already exists');
    },
    async editPullRequest(number, { body }) {
      editedPullRequestBody = body;
      return { ...basePullRequest, number, body };
    },
    async editIssue(number, edits) {
      return {
        ...story,
        number,
        body: edits.body,
        state: 'OPEN',
        labels: [{ name: 'user-story' }, { name: 'status:in-progress' }],
      };
    },
  };

  const { issue, pullRequest } = await applyStoryLifecycle(42, {
    status: 'in-progress',
    knowledgeLinks: ['wiki/knowledge/auth-plan.md'],
    backend,
  });

  assert.equal(createdPullRequest, false);
  assert.ok(editedPullRequestBody.includes('## Knowledge context'));
  assert.ok(editedPullRequestBody.includes('wiki/knowledge/auth-plan.md'));
  assert.equal(pullRequest.number, 88);
  assert.ok(pullRequest.body.includes('wiki/knowledge/auth-plan.md'));
  assert.ok(issue.body.includes('Knowledge Links'));
  assert.ok(issue.body.includes('wiki/knowledge/auth-plan.md'));
});

test('applyStoryLifecycle preserves non-managed existing story PR bodies', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const story = {
    number: 42,
    title: 'story(#7): Implement login',
    state: 'OPEN',
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };
  const basePullRequest = {
    number: 88,
    title: story.title,
    body: `## Summary\nImplements ${story.title}\n\n## Linked story\nRefs #${story.number}\n\n## Manual notes\nKeep this reviewer checklist intact.`,
    url: 'https://example.com/pull/88',
    isDraft: true,
  };
  let editedPullRequestBody = '';

  const backend = {
    async viewIssue() {
      return structuredClone(story);
    },
    async listPullRequests() {
      return [structuredClone(basePullRequest)];
    },
    async editPullRequest(number, { body }) {
      editedPullRequestBody = body;
      return { ...basePullRequest, number, body };
    },
    async editIssue(number, edits) {
      return {
        ...story,
        number,
        body: edits.body,
        state: 'OPEN',
        labels: [{ name: 'user-story' }, { name: 'status:in-progress' }],
      };
    },
  };

  const { issue, pullRequest } = await applyStoryLifecycle(42, {
    status: 'in-progress',
    knowledgeLinks: ['wiki/knowledge/auth-plan.md'],
    backend,
  });

  assert.equal(editedPullRequestBody, '');
  assert.equal(pullRequest.body, basePullRequest.body);
  assert.ok(issue.body.includes('Knowledge Links'));
  assert.ok(issue.body.includes('wiki/knowledge/auth-plan.md'));
});

test('applyStoryLifecycle resyncs managed PR bodies after a story rename', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const story = {
    number: 42,
    title: 'story(#7): Implement passwordless login',
    state: 'OPEN',
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };
  const basePullRequest = {
    number: 88,
    title: story.title,
    body: '## Summary\nImplements story(#7): Implement login\n\n## Linked story\nRefs #42\n',
    url: 'https://example.com/pull/88',
    isDraft: true,
  };
  let editedPullRequestBody = '';

  const backend = {
    async viewIssue() {
      return structuredClone(story);
    },
    async listPullRequests() {
      return [structuredClone(basePullRequest)];
    },
    async editPullRequest(number, { body }) {
      editedPullRequestBody = body;
      return { ...basePullRequest, number, body };
    },
    async editIssue(number, edits) {
      return {
        ...story,
        number,
        body: edits.body,
        state: 'OPEN',
        labels: [{ name: 'user-story' }, { name: 'status:in-progress' }],
      };
    },
  };

  const { pullRequest } = await applyStoryLifecycle(42, {
    status: 'in-progress',
    backend,
  });

  assert.ok(editedPullRequestBody.includes('Implements story(#7): Implement passwordless login'));
  assert.equal(pullRequest.number, 88);
});

test('applyStoryLifecycle merges knowledge links before creating a story PR', async () => {
  const { applyStoryLifecycle } = await import('../src/automation/lifecycle.js');
  const story = {
    number: 42,
    title: 'story(#7): Implement login',
    state: 'OPEN',
    body: '## Metadata\n- **Status:** open\n',
    labels: [{ name: 'user-story' }, { name: 'status:open' }],
  };
  let createdPullRequestBody = '';

  const backend = {
    async viewIssue() {
      return structuredClone(story);
    },
    async listPullRequests() {
      return [];
    },
    getCurrentBranch() {
      return 'feature/auth-login';
    },
    async createPullRequest({ title, body, head, draft }) {
      createdPullRequestBody = body;
      return {
        number: 88,
        title,
        body,
        head,
        draft,
        url: 'https://example.com/pull/88',
        isDraft: true,
      };
    },
    async editIssue(number, edits) {
      return {
        ...story,
        number,
        body: edits.body,
        state: 'OPEN',
        labels: [{ name: 'user-story' }, { name: 'status:in-progress' }],
      };
    },
  };

  const { issue, pullRequest } = await applyStoryLifecycle(42, {
    status: 'in-progress',
    knowledgeLinks: ['wiki/knowledge/auth-plan.md'],
    backend,
  });

  assert.equal(pullRequest.number, 88);
  assert.ok(createdPullRequestBody.includes('## Knowledge context'));
  assert.ok(createdPullRequestBody.includes('wiki/knowledge/auth-plan.md'));
  assert.ok(issue.body.includes('Knowledge Links'));
  assert.ok(issue.body.includes('wiki/knowledge/auth-plan.md'));
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

test('story update rejects no-op edits before invoking gh', async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-story-update-noop-'));

  try {
    const result = run(['story', 'update', '42'], { cwd });

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Pass at least one update option.'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('epic create forwards knowledge links through gh issue create output flow', { skip: process.platform === 'win32' }, async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-gh-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  const ghLog = join(cwd, 'gh.log');
  const ghScriptPath = join(cwd, 'gh.js');
  const ghPath = join(cwd, process.platform === 'win32' ? 'gh.cmd' : 'gh');
  fs.writeFileSync(ghScriptPath, `#!/usr/bin/env node
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
  if (process.platform === 'win32') {
    fs.writeFileSync(ghPath, `@echo off\r\nnode "%~dp0\\gh.js" %*\r\n`);
  } else {
    fs.writeFileSync(ghPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/gh.js" "$@"\n`);
    fs.chmodSync(ghPath, 0o755);
  }

  try {
    const result = run(['epic', 'create', 'Ship auth', '-d', 'Test body', '-p', '3', '--start', '2026-01-01', '--end', '2026-01-14', '--knowledge', 'wiki/knowledge/auth-plan.md'], {
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
    const bodyArg = issueCreate[issueCreate.indexOf('--body') + 1];
    assert.ok(bodyArg.includes('Knowledge Links'));
    assert.ok(bodyArg.includes('wiki/knowledge/auth-plan.md'));
    assert.deepEqual(issueView, ['issue', 'view', '123', '--json', 'number,title,state,body,labels,assignees,createdAt,updatedAt,url']);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('epic update applies points and blockers', { skip: process.platform === 'win32' }, async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-epic-update-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  const ghLog = join(cwd, 'gh.log');
  const ghScriptPath = join(cwd, 'gh.js');
  const ghPath = join(cwd, 'gh');
  fs.writeFileSync(ghScriptPath, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(ghLog)}, JSON.stringify(args) + '\\n');
if (args[0] === 'issue' && args[1] === 'view') {
  process.stdout.write(JSON.stringify({
    number: 12,
    url: 'https://github.com/Atena-IT/git-tasks/issues/12',
    title: 'epic: Ship auth',
    state: 'OPEN',
    body: '## Description\\nTest\\n\\n## Metadata\\n- **Status:** open\\n- **Story Points:** 3\\n- **Knowledge Links:** \\n\\n## Dependencies\\n<!-- List blocking epics/issues -->\\n\\n## Notes\\n',
    labels: [{ name: 'epic' }, { name: 'status:open' }],
    assignees: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }));
  process.exit(0);
}
if (args[0] === 'issue' && args[1] === 'edit') {
  process.exit(0);
}
console.error('Unexpected gh invocation: ' + args.join(' '));
process.exit(1);
`);
  fs.writeFileSync(ghPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/gh.js" "$@"\n`);
  fs.chmodSync(ghPath, 0o755);

  try {
    const result = run(['epic', 'update', '12', '--points', '5', '--add-blocker', '99'], {
      cwd,
      env: { PATH: `${cwd}:${process.env.PATH}` },
    });

    assert.equal(result.status, 0, result.stderr);
    const commands = fs.readFileSync(ghLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const issueEdit = commands.find((args) => args[0] === 'issue' && args[1] === 'edit');
    const bodyArg = issueEdit[issueEdit.indexOf('--body') + 1];

    assert.ok(bodyArg.includes('- **Story Points:** 5'));
    assert.ok(bodyArg.includes('## Dependencies\n- #99'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('sprint update applies epic and points without changing the raw title', { skip: process.platform === 'win32' }, async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-sprint-update-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  const ghLog = join(cwd, 'gh.log');
  const ghScriptPath = join(cwd, 'gh.js');
  const ghPath = join(cwd, 'gh');
  fs.writeFileSync(ghScriptPath, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(ghLog)}, JSON.stringify(args) + '\\n');
if (args[0] === 'issue' && args[1] === 'view') {
  process.stdout.write(JSON.stringify({
    number: 7,
    url: 'https://github.com/Atena-IT/git-tasks/issues/7',
    title: 'sprint(#3): Auth Sprint 1',
    state: 'OPEN',
    body: '## Description\\nTest\\n\\n## Metadata\\n- **Status:** open\\n- **Story Points:** 3\\n- **Epic:** #3\\n- **Knowledge Links:** \\n\\n## Notes\\n',
    labels: [{ name: 'sprint' }, { name: 'status:open' }],
    assignees: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }));
  process.exit(0);
}
if (args[0] === 'issue' && args[1] === 'edit') {
  process.exit(0);
}
console.error('Unexpected gh invocation: ' + args.join(' '));
process.exit(1);
`);
  fs.writeFileSync(ghPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/gh.js" "$@"\n`);
  fs.chmodSync(ghPath, 0o755);

  try {
    const result = run(['sprint', 'update', '7', '--epic', '8', '--points', '5'], {
      cwd,
      env: { PATH: `${cwd}:${process.env.PATH}` },
    });

    assert.equal(result.status, 0, result.stderr);
    const commands = fs.readFileSync(ghLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const issueEdit = commands.find((args) => args[0] === 'issue' && args[1] === 'edit');
    const titleArg = issueEdit[issueEdit.indexOf('--title') + 1];
    const bodyArg = issueEdit[issueEdit.indexOf('--body') + 1];

    assert.equal(titleArg, 'sprint(#8): Auth Sprint 1');
    assert.ok(bodyArg.includes('- **Story Points:** 5'));
    assert.ok(bodyArg.includes('- **Epic:** #8'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('epic create continues when label creation is not permitted', { skip: process.platform === 'win32' }, async () => {
  const cwd = fs.mkdtempSync(join(os.tmpdir(), 'git-tasks-gh-labels-'));
  spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
  const ghLog = join(cwd, 'gh.log');
  const ghScriptPath = join(cwd, 'gh.js');
  const ghPath = join(cwd, process.platform === 'win32' ? 'gh.cmd' : 'gh');
  fs.writeFileSync(ghScriptPath, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(ghLog)}, JSON.stringify(args) + '\\n');
if (args[0] === 'label' && args[1] === 'list') {
  process.stdout.write('[]\\n');
  process.exit(0);
}
if (args[0] === 'label' && args[1] === 'create') {
  console.error('HTTP 403: Resource not accessible by integration');
  process.exit(1);
}
if (args[0] === 'issue' && args[1] === 'create') {
  process.stdout.write('https://github.com/Atena-IT/git-tasks/issues/321\\n');
  process.exit(0);
}
if (args[0] === 'issue' && args[1] === 'view') {
  process.stdout.write(JSON.stringify({
    number: 321,
    url: 'https://github.com/Atena-IT/git-tasks/issues/321',
    title: 'epic: Ship auth',
    state: 'OPEN',
    body: 'Test body',
    labels: [],
    assignees: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }));
  process.exit(0);
}
console.error('Unexpected gh invocation: ' + args.join(' '));
process.exit(1);
`);
  if (process.platform === 'win32') {
    fs.writeFileSync(ghPath, `@echo off\r\nnode "%~dp0\\gh.js" %*\r\n`);
  } else {
    fs.writeFileSync(ghPath, `#!/usr/bin/env sh\nnode "$(dirname "$0")/gh.js" "$@"\n`);
    fs.chmodSync(ghPath, 0o755);
  }

  try {
    const result = run(['epic', 'create', 'Ship auth', '-d', 'Test body', '-p', '3', '--start', '2026-01-01', '--end', '2026-01-14'], {
      cwd,
      env: { PATH: `${cwd}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('Created epic #321: https://github.com/Atena-IT/git-tasks/issues/321'));

    const commands = fs.readFileSync(ghLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const issueCreate = commands.find((args) => args[0] === 'issue' && args[1] === 'create');

    assert.ok(issueCreate, 'expected gh issue create to be called');
    assert.ok(!issueCreate.includes('--label'), 'gh issue create should skip labels when they cannot be ensured');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
