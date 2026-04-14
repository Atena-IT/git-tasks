# geet-tasks

> AI-native GitHub issue planning from the command line.

`geet-tasks` wraps the [GitHub CLI (`gh`)](https://cli.github.com/) so humans and coding agents can manage **epics**, **sprints**, and **user stories** without leaving the terminal.

## Prerequisites

- Node.js >= 24
- [GitHub CLI](https://cli.github.com/) authenticated via `gh auth login`

## Install the CLI

```bash
npm install -g geet-tasks
npx geet-tasks --help
```

Until the npm package is published, install the current GitHub source with:

```bash
npm install -g github:Atena-IT/git-tasks
```

The package and skill are branded as `geet-tasks`, while the GitHub repository URL remains `Atena-IT/git-tasks`.

## Install the Agent Skill

### AgentSkills installer

```bash
npx @favelasquez/agentskills
# choose: Install from custom repository
# repository URL: https://github.com/Atena-IT/git-tasks/tree/main/skills
# select: geet-tasks
# choose your target agent(s)
```

### Manual install

```bash
# Claude Code
mkdir -p .claude/commands
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/geet-tasks/SKILL.md \
  -o .claude/commands/geet-tasks.md

# GitHub Copilot
mkdir -p .github/skills/geet-tasks
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/geet-tasks/SKILL.md \
  -o .github/skills/geet-tasks/SKILL.md

# Codex / Gemini CLI / Cline
mkdir -p .codex/skills .gemini/skills .clinerules
curl -fsSL https://raw.githubusercontent.com/Atena-IT/git-tasks/main/skills/geet-tasks/SKILL.md \
  -o .codex/skills/geet-tasks.md
cp .codex/skills/geet-tasks.md .gemini/skills/geet-tasks.md
cp .codex/skills/geet-tasks.md .clinerules/geet-tasks.md
```

The canonical skill source in this repository is `skills/geet-tasks/SKILL.md`.

## Issue Title Convention

| Type       | Format                        | Example                        |
|------------|-------------------------------|--------------------------------|
| Epic       | `epic: <title>`               | `epic: User Authentication`    |
| Sprint     | `sprint(<epic-ref>): <title>` | `sprint(#3): Auth Sprint 1`    |
| User Story | `us(<sprint-ref>): <title>`   | `us(#7): Login form`           |

Labels created automatically: `epic`, `sprint`, `user-story`

## Quick Reference

### Epics
```bash
geet-tasks epic create "Title" [-d <desc>] [-p <points>] [--start <date>] [--end <date>] [-a <user>]
geet-tasks epic list [--state open|closed|all] [--short]
geet-tasks epic show <number> [--comments]
geet-tasks epic update <number> [--title <text>] [--points <n>] [--status open|closed]
```

### Sprints
```bash
geet-tasks sprint create "Title" [-e <epic>] [-d <desc>] [-p <points>] [--start <date>] [--end <date>]
geet-tasks sprint list [--epic <n>] [--state open|closed|all] [--short]
geet-tasks sprint show <number> [--comments]
geet-tasks sprint update <number> [--title <text>] [--status open|closed]
```

### User Stories
```bash
geet-tasks story create "Title" [-s <sprint>] [-e <epic>] [-p <points>] [--priority low|medium|high]
geet-tasks story list [--sprint <n>] [--epic <n>] [--assignee <user>] [--state open|closed|all] [--short]
geet-tasks story show <number> [--comments]
geet-tasks story update <number> [--status closed]
```

### Overview
```bash
geet-tasks overview [--depth 1|2|3] [--state open|closed|all]
# depth 1=epics only, 2=+sprints, 3=+stories (default: 1)
```

### Wiki
```bash
geet-tasks wiki init
geet-tasks wiki list
geet-tasks wiki show <file>
```

## Agent-friendly usage

```bash
geet-tasks overview --depth 2
geet-tasks epic list --short
geet-tasks story list --short --sprint 5
```

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
