# git-tasks

> AI-native GitHub issue planning from the command line.

`git-tasks` wraps the [GitHub CLI (`gh`)](https://cli.github.com/) so humans and coding agents can manage **epics**, **sprints**, and **user stories** without leaving the terminal.

## Prerequisites

- Node.js >= 24
- [GitHub CLI](https://cli.github.com/) authenticated via `gh auth login`

## Install the CLI

```bash
npm install -g git-tasks
npx git-tasks --help
```

Until the npm package is published, install the current GitHub source with:

```bash
npm install -g github:Atena-IT/git-tasks
```

The package and skill are branded as `git-tasks`, while the GitHub repository URL remains `Atena-IT/git-tasks`.

## Install the Agent Skill

### One-command installer

```bash
npx git-tasks skill install --target all
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
git-tasks epic create "Title" [-d <desc>] [-p <points>] [--start <date>] [--end <date>] [-a <user>]
git-tasks epic list [--state open|closed|all] [--short]
git-tasks epic show <number> [--comments]
git-tasks epic update <number> [--title <text>] [--points <n>] [--status open|closed]
```

### Sprints
```bash
git-tasks sprint create "Title" [-e <epic>] [-d <desc>] [-p <points>] [--start <date>] [--end <date>]
git-tasks sprint list [--epic <n>] [--state open|closed|all] [--short]
git-tasks sprint show <number> [--comments]
git-tasks sprint update <number> [--title <text>] [--status open|closed]
```

### User Stories
```bash
git-tasks story create "Title" [-s <sprint>] [-e <epic>] [-p <points>] [--priority low|medium|high]
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
git-tasks wiki init
git-tasks wiki list
git-tasks wiki show <file>
```

## Agent-friendly usage

```bash
git-tasks overview --depth 2
git-tasks epic list --short
git-tasks story list --short --sprint 5
git-tasks story update 42 --status in-progress
git-tasks story update 42 --status ready-for-review --reviewer octocat
```

## Task lifecycle automation

- `story update --status in-progress` keeps the story open, updates its workflow status, and ensures a draft PR exists for the current branch.
- `story update --status ready-for-review` promotes the linked draft PR to ready for review and can request reviewers via `--reviewer` or `GIT_TASKS_REVIEWERS=user1,user2`.
- `story update --status closed` closes the story and automatically closes the parent sprint and epic when all of their children are closed.
- `sprint update --status closed` also cascades closure up to the parent epic when appropriate.

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
