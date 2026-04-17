---
name: git-tasks
description: AI-native project management CLI for GitHub. Use when the user wants to inspect or update the planning hierarchy (epics, sprints, user stories), drive story lifecycle transitions (start work, ready for review, close), or integrate raw inputs such as client meeting notes or feature transcripts into the existing plan — either by updating open items or creating new ones as a diff. Do not use for reading a single issue or PR without any project-management intent; prefer standard gh commands for those one-off lookups. Triggers include "what's the current sprint status", "create a story for this feature", "move this story to in-progress", "close out the sprint", "update the plan based on today's meeting notes", or any request involving epics, sprints, or story lifecycle management.
allowed-tools: Bash(git-tasks:*), Bash(npx git-tasks:*)
hidden: true
---

# git-tasks

**Use when** you are acting as an AI project manager — inspecting or updating epics, sprints, and user stories, driving story lifecycle transitions, or translating raw inputs (meeting notes, feature requests, transcripts) into structured project plan changes.

**Do not use** for one-off issue or PR lookups without project-management intent. For those, use standard `gh` commands:
```bash
gh issue view <n>
gh pr view <n>
gh issue list
gh pr list
```

## Before you start

### 1. Verify and install the CLI

Check whether `git-tasks` is available:

```bash
git-tasks --version 2>/dev/null || npx --yes git-tasks --version
```

If the global command is missing, install it permanently:

```bash
npm install -g git-tasks
```

Or use it on-demand without installing:

```bash
npx git-tasks <command>
```

### 2. Verify GitHub authentication

```bash
gh auth status
```

If the command fails or shows "not logged in", run:

```bash
gh auth login
```

Follow the interactive prompts (choose GitHub.com → HTTPS → browser or token).

### 3. Usage notes

- Prefer `--short` output unless you need full issue bodies or comments.
- Start with `git-tasks overview --depth 2` before drilling into individual issues.
- Install the skill anywhere with `npx git-tasks skill install --target all`.

## Recommended workflow

1. Inspect the hierarchy with `git-tasks overview --depth 2`.
2. Find the right epic with `git-tasks epic list --short`.
3. Find the right sprint with `git-tasks sprint list --epic <n> --short`.
4. Inspect or update stories with `git-tasks story list --sprint <n> --short`.
5. Use `show` only when you need full body text or comments.

## Core commands

### Create

```bash
git-tasks epic create "Epic title" -d "description" -p 13
git-tasks sprint create "Sprint title" --epic <n> --start YYYY-MM-DD --end YYYY-MM-DD
git-tasks story create "Story title" --sprint <n> --epic <n> -p 3 --priority high -a <username>
```

### Inspect

```bash
git-tasks epic list --short
git-tasks sprint list --epic <n> --short
git-tasks story list --sprint <n> --short
git-tasks epic show <n>
git-tasks sprint show <n>
git-tasks story show <n>
```

### Update

```bash
git-tasks epic update <n> --status closed --points 21
git-tasks sprint update <n> --status closed
git-tasks story update <n> --status in-progress
git-tasks story update <n> --status ready-for-review --reviewer octocat
git-tasks story update <n> --status closed
git-tasks story update <n> -a <username>
```

### Wiki

```bash
git-tasks wiki init
git-tasks wiki list
git-tasks wiki show <filename>
```

## Title conventions

- Epic: `epic: <title>`
- Sprint: `sprint(#<epic-number>): <title>`
- User story: `story(#<sprint-number>): <title>`

## Output guidance

- Use `overview` for context.
- Use `list --short` for low-token discovery.
- Use `show --comments` only when comments matter.
- Reuse returned issue numbers as stable references.
