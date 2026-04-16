---
name: git-tasks
description: Use the git-tasks CLI to manage GitHub issues as epics, sprints, and user stories.
---

# git-tasks

Use this skill when you need a fast, structured way to inspect or update GitHub issue planning data with the `git-tasks` CLI.

## Before you start

- Ensure `gh auth status` succeeds.
- Prefer `--short` output unless you need full issue bodies or comments.
- Start with `git-tasks overview --depth 2` before drilling into individual issues.

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
git-tasks story create "Story title" --sprint <n> --epic <n> -p 3 --priority high
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
git-tasks story update <n> --status closed
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
- User story: `us(#<sprint-number>): <title>`

## Output guidance

- Use `overview` for context.
- Use `list --short` for low-token discovery.
- Use `show --comments` only when comments matter.
- Reuse returned issue numbers as stable references.
