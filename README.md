# git-tasks

> AI-native GitHub issue planning from the command line.

`git-tasks` wraps the [GitHub CLI (`gh`)](https://cli.github.com/) so humans and coding agents can manage **epics**, **sprints**, and **user stories** without leaving the terminal.

## Prerequisites

- Node.js >= 24
- [GitHub CLI](https://cli.github.com/) authenticated via `gh auth login`

## Install the CLI

```bash
npm install -g @atena-reply/git-tasks
npx @atena-reply/git-tasks --help
```

The npm package is published as `@atena-reply/git-tasks`, while the installed command remains `git-tasks`. The GitHub repository URL remains `Atena-IT/git-tasks`.

## Install the Agent Skill

### One-command installer

```bash
npx @atena-reply/git-tasks skill install --target all
```

Available targets: `claude`, `copilot`, `codex`, `gemini`, `cline`, `all`.

### Claude Code marketplace

The repository ships a `.claude-plugin/marketplace.json` that registers git-tasks in the Claude Code plugin marketplace. Claude Code will pick up the skill automatically from `skills/git-tasks/SKILL.md` when the plugin is installed.

### AgentSkills installer

```bash
npx @favelasquez/agentskills
# choose: Install from custom repository
# repository URL: https://github.com/Atena-IT/git-tasks/tree/main/skills
# select: git-tasks
# choose your target agent(s)
```

### Manual install

```bash
# Claude Code
mkdir -p .claude/commands
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/git-tasks/SKILL.md \
  -o .claude/commands/git-tasks.md

# GitHub Copilot
mkdir -p .github/skills/git-tasks
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/git-tasks/SKILL.md \
  -o .github/skills/git-tasks/SKILL.md

# Codex / Gemini CLI / Cline
mkdir -p .codex/skills .gemini/skills .clinerules
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/git-tasks/SKILL.md \
  -o .codex/skills/git-tasks.md
cp .codex/skills/git-tasks.md .gemini/skills/git-tasks.md
cp .codex/skills/git-tasks.md .clinerules/git-tasks.md
```

The canonical skill source in this repository is `skills/git-tasks/SKILL.md`.

## Issue Title Convention

| Type       | Format                        | Example                        |
|------------|-------------------------------|--------------------------------|
| Epic       | `epic: <title>`               | `epic: User Authentication`    |
| Sprint     | `sprint(<epic-ref>): <title>` | `sprint(#3): Auth Sprint 1`    |
| User Story | `story(<sprint-ref>): <title>` | `story(#7): Login form`        |

Labels created automatically: `epic`, `sprint`, `user-story`

## Quick Reference

### Epics
```bash
git-tasks epic create "Title" -d <desc> -p <points> --start <date> --end <date> [-k <wiki/knowledge/file.md>] [-a <user>]
git-tasks epic list [--state open|closed|all] [--short]
git-tasks epic show <number> [--comments]
git-tasks epic update <number> [--title <text>] [--points <n>] [--status open|closed]
```

### Sprints
```bash
git-tasks sprint create "Title" -e <epic> -d <desc> -p <points> --start <date> --end <date> [-k <wiki/knowledge/file.md>] [-a <user>]
git-tasks sprint list [--epic <n>] [--state open|closed|all] [--short]
git-tasks sprint show <number> [--comments]
git-tasks sprint update <number> [--title <text>] [--status open|closed]
```

### User Stories
```bash
git-tasks story create "Title" -s <sprint> -e <epic> -d <desc> -p <points> --priority low|medium|high [-a <user>]
git-tasks story list [--sprint <n>] [--epic <n>] [--assignee <user>] [--state open|closed|all] [--short]
git-tasks story show <number> [--comments]
git-tasks story update <number> [--status open|in-progress|ready-for-review|closed] [--reviewer <user>]
```

### Overview
```bash
git-tasks overview [--depth 1|2|3] [--state open|closed|all]
# depth 1=epics only, 2=+sprints, 3=+stories (default: 1)
```

### Wiki
```bash
git-tasks init
git-tasks wiki list
git-tasks wiki show inbox/<file>
git-tasks wiki show knowledge/index
```

## Agent-friendly usage

```bash
git-tasks init --owner octocat --reviewer octocat
git-tasks overview --depth 2
git-tasks epic list --short
git-tasks story list --short --sprint 5
git-tasks story update 42 --status in-progress --knowledge wiki/knowledge/auth-plan.md
git-tasks story update 42 --status ready-for-review --reviewer octocat
```

## AI-native planning granularity

- **Stories** are agent-sized atomic slices: independently executable work that should usually take from a few hours up to one day.
- **Sprints** are short execution windows and should usually stay within three days.
- **Epics** are the largest planning bucket and should usually stay within two weeks.
- `.git-tasks/config.json` can override these defaults with repo-specific `planningHorizons` for agents to read.
- Always keep dependencies explicit: stories belong to a sprint and epic, sprints belong to an epic, and each item should carry enough metadata to be auditable without extra chat context.

## Wiki-first knowledge workflow

- Initialize the repository once with `git-tasks init`.
- Put inbound human or system inputs in `wiki/inbox/` exactly as they arrive: meeting notes, pasted chats, TODO dumps, transcripts, uploads, or scratch notes.
- Read `wiki/knowledge/index.md` before opening individual knowledge files so you reuse existing context instead of creating duplicate nodes.
- Keep `wiki/knowledge/` flat. The semantic kind belongs in frontmatter `type`, not in subdirectories.
- Use dash-case frontmatter keys for knowledge nodes. A practical minimum is `id`, `type`, `title`, `timestamp`, `status`, `tags`, `sources`, `issue-refs`, `neighbours`, and `supersedes`.
- Knowledge node bodies should capture the context/source, interpretation, planning changes, rationale, and consequences.
- Update or create knowledge nodes only when durable understanding changes. Then update epics, sprints, and stories from that compiled knowledge when the plan actually changed.
- When backlog items are tied to specific knowledge docs, store repo-relative `wiki/knowledge/...` paths in issue `Knowledge Links` metadata.
- Legacy `wiki/raw/` and `wiki/processed/` content may still be read for historical context, but new writes should target `wiki/inbox/` and `wiki/knowledge/`.

## Configuration

Run `git-tasks init --owner <user> --reviewer <user>` to create `.git-tasks/config.json` at the repository root. Commit this file so human teammates and AI agents share the same defaults.

```json
{
  "owner": "octocat",
  "defaultReviewers": ["octocat"],
  "planningHorizons": {
    "storyMaxDays": 1,
    "sprintMaxDays": 3,
    "epicMaxWeeks": 2
  }
}
```

- `defaultReviewers` is the repo-level fallback when `--reviewer` is not passed and `GIT_TASKS_REVIEWERS` is not set.
- `owner` is the last reviewer fallback when `defaultReviewers` is empty.
- `planningHorizons` is for AI guidance, not CLI enforcement. It lets each repo tighten or relax the default story/sprint/epic sizing without editing the shipped skill text.

## Task lifecycle automation

- New material in `wiki/inbox/` by itself does **not** create or update issues, branches, or pull requests.
- New or updated knowledge in `wiki/knowledge/` may lead to epic, sprint, or story create/update operations when the planning delta is real.
- `story update --status in-progress` keeps the story open, updates its workflow status, and ensures a draft PR exists for the current branch.
- Agents should pick up stories in an isolated worktree with a named branch and attached draft PR so execution stays reviewable and self-contained.
- Routine execution should not create new knowledge nodes unless durable understanding or planning changed.
- `story update --status ready-for-review` promotes the linked draft PR to ready for review and requires reviewers via `--reviewer`, `GIT_TASKS_REVIEWERS=user1,user2`, or the repo-level defaults in `.git-tasks/config.json`.
- When a story is tied to knowledge docs, surface those docs via issue `Knowledge Links` metadata and in the story PR body for reviewer context.
- `story update --status closed` closes the story and automatically closes the parent sprint and epic when all of their children are closed.
- `sprint update --status closed` also cascades closure up to the parent epic when appropriate.
- Branches and draft PRs are execution artifacts for stories, not wiki entities.

## Adding a Backend

Implement the interface in `src/backends/` and register it in `src/backends/index.js`:

```js
export default {
  createIssue({ title, body, labels, assignees }),
  listIssues({ labels, state, limit }),
  viewIssue(number, { comments }),
  editIssue(number, { title, body, addLabels, removeLabels, addAssignees, state }),
}
```

## License

ISC
