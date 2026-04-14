---
name: geet-tasks
description: Use the geet-tasks CLI to manage GitHub issues as epics, sprints, and user stories.
---

# geet-tasks

Use this skill when you need a fast, structured way to inspect or update GitHub issue planning data with the `geet-tasks` CLI.

## Before you start

- Ensure `gh auth status` succeeds.
- Prefer `--short` output unless you need full issue bodies or comments.
- Start with `geet-tasks overview --depth 2` before drilling into individual issues.

## Recommended workflow

1. Inspect the hierarchy with `geet-tasks overview --depth 2`.
2. Find the right epic with `geet-tasks epic list --short`.
3. Find the right sprint with `geet-tasks sprint list --epic <n> --short`.
4. Inspect or update stories with `geet-tasks story list --sprint <n> --short`.
5. Use `show` only when you need full body text or comments.

## Core commands

### Create

```bash
geet-tasks epic create "Epic title" -d "description" -p 13
geet-tasks sprint create "Sprint title" --epic <n> --start YYYY-MM-DD --end YYYY-MM-DD
geet-tasks story create "Story title" --sprint <n> --epic <n> -p 3 --priority high
```

### Inspect

```bash
geet-tasks epic list --short
geet-tasks sprint list --epic <n> --short
geet-tasks story list --sprint <n> --short
geet-tasks epic show <n>
geet-tasks sprint show <n>
geet-tasks story show <n>
```

### Update

```bash
geet-tasks epic update <n> --status closed --points 21
geet-tasks sprint update <n> --status closed
geet-tasks story update <n> --status closed
```

### Wiki

```bash
geet-tasks wiki init
geet-tasks wiki list
geet-tasks wiki show <filename>
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
