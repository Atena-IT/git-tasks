# git-planner

> AI-native project management via GitHub issues — epics, sprints, and user stories from the command line.

## Overview

`git-planner` wraps the [GitHub CLI (`gh`)](https://cli.github.com/) to turn GitHub Issues into a structured project management suite. Designed for **AI coding agents** and humans alike.

- **Cross-platform** — Node.js, works anywhere `node` and `gh` run
- **AI-native** — structured output, short modes, token-efficient progressive disclosure
- **Extensible** — backend abstraction (swap GitHub for GitLab etc.)
- **Zero config** — uses your current repo context from `gh`

## Prerequisites

- Node.js >= 18
- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated via `gh auth login`

## Installation

```bash
npm install -g git-planner
# or run locally
npx git-planner --help
```

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
git-planner epic create "Title" [-d <desc>] [-p <points>] [--start <date>] [--end <date>] [-a <user>]
git-planner epic list [--state open|closed|all] [--short]
git-planner epic show <number> [--comments]
git-planner epic update <number> [--title <text>] [--points <n>] [--status open|closed]
```

### Sprints
```bash
git-planner sprint create "Title" [-e <epic>] [-d <desc>] [-p <points>] [--start <date>] [--end <date>]
git-planner sprint list [--epic <n>] [--state open|closed|all] [--short]
git-planner sprint show <number> [--comments]
git-planner sprint update <number> [--title <text>] [--status open|closed]
```

### User Stories
```bash
git-planner story create "Title" [-s <sprint>] [-e <epic>] [-p <points>] [--priority low|medium|high]
git-planner story list [--sprint <n>] [--epic <n>] [--assignee <user>] [--state open|closed|all] [--short]
git-planner story show <number> [--comments]
git-planner story update <number> [--status closed]
```

### Overview
```bash
git-planner overview [--depth 1|2|3] [--state open|closed|all]
# depth 1=epics only, 2=+sprints, 3=+stories (default: 1)
```

### Wiki
```bash
git-planner wiki init          # create wiki/ directory
git-planner wiki list          # list wiki markdown files
git-planner wiki show <file>   # display a wiki file
```

## Token-Efficient Usage (AI Agents)

```bash
git-planner epic list --short       # minimal output
git-planner overview --depth 2      # epics + sprints only
git-planner story list --short --sprint 5
```

## Adding a New Backend

Implement the interface in `src/backends/` and register in `src/backends/index.js`:

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
