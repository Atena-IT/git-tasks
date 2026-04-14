# git-planner — Claude Skill

You have access to `git-planner`, a CLI tool that manages GitHub Issues as an AI-native project management suite (epics, sprints, user stories).

## Setup Check

Before using, verify `gh` is authenticated:
```bash
gh auth status
```

## Issue Title Convention

- **Epic:** `epic: <title>`
- **Sprint:** `sprint(#<epic-number>): <title>`
- **User Story:** `us(#<sprint-number>): <title>`

Labels (`epic`, `sprint`, `user-story`) are auto-created.

## Core Commands

### Create hierarchy
```bash
git-planner epic create "Epic Title" -d "description" -p 13
git-planner sprint create "Sprint Title" --epic <n> --start YYYY-MM-DD --end YYYY-MM-DD
git-planner story create "Story Title" --sprint <n> --epic <n> -p 3 --priority high
```

### Inspect (use --short to save tokens)
```bash
git-planner epic list --short
git-planner sprint list --epic <n> --short
git-planner story list --sprint <n> --short
git-planner epic show <n>
git-planner sprint show <n>
git-planner story show <n>
```

### Overview (hierarchical)
```bash
git-planner overview              # epics only
git-planner overview --depth 2   # + sprints
git-planner overview --depth 3   # full tree
```

### Update / Close
```bash
git-planner story update <n> --status closed
git-planner sprint update <n> --status closed
git-planner epic update <n> --status closed --points 21
```

### Wiki
```bash
git-planner wiki init
git-planner wiki list
git-planner wiki show <filename>
```

## Recommended Workflow

1. `git-planner overview --depth 2` — understand existing structure
2. `git-planner epic list --short` — get epic numbers
3. `git-planner sprint list --epic <n> --short` — get sprints for epic
4. `git-planner story list --sprint <n> --short` — get stories in sprint
5. Create or update as needed

## Token Efficiency

- Use `--short` for all list commands unless detail is required
- Use `overview` before drilling down
- Use `show` only when body/comments are needed
