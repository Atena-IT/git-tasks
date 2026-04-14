# git-planner Skill

## What is git-planner?

`git-planner` is an AI-native CLI tool that wraps the GitHub CLI (`gh`) to manage GitHub Issues as a project management suite with **epics**, **sprints**, and **user stories**.

## When to Use

Use `git-planner` when you need to:
- Create or inspect project epics, sprints, or user stories
- Traverse the issue hierarchy (epic → sprint → story)
- Get a token-efficient overview of project status
- Manage project planning without leaving the terminal

## Title Convention

Issues follow conventional-commit prefix format:
- **Epic:** `epic: <title>`
- **Sprint:** `sprint(<epic-ref>): <title>` (e.g., `sprint(#3): Sprint 1`)
- **User Story:** `us(<sprint-ref>): <title>` (e.g., `us(#7): Login page`)

## Labels

- `epic` — epics
- `sprint` — sprints
- `user-story` — user stories

Labels are created automatically on first use.

---

## Commands Reference

### Epics

```bash
# Create
git-planner epic create "User Authentication" -d "All auth features" -p 13 --start 2024-01-01

# List (token-efficient with --short)
git-planner epic list
git-planner epic list --short
git-planner epic list --state all

# Show detail
git-planner epic show 3
git-planner epic show 3 --comments

# Update
git-planner epic update 3 --title "New Title" --points 21 --status closed
```

### Sprints

```bash
# Create (link to epic with --epic)
git-planner sprint create "Sprint 1" --epic 3 -d "First sprint" --start 2024-01-01 --end 2024-01-14

# List
git-planner sprint list
git-planner sprint list --epic 3 --short
git-planner sprint list --state all

# Show
git-planner sprint show 7
git-planner sprint show 7 --comments

# Update
git-planner sprint update 7 --status closed
```

### User Stories

```bash
# Create (link to sprint and epic)
git-planner story create "Login form" --sprint 7 --epic 3 -p 3 --priority high -a johndoe

# List
git-planner story list
git-planner story list --sprint 7 --short
git-planner story list --assignee johndoe
git-planner story list --state all

# Show
git-planner story show 12
git-planner story show 12 --comments

# Update
git-planner story update 12 --status closed
git-planner story update 12 --priority low -a janedoe
```

### Overview (hierarchical tree)

```bash
git-planner overview              # epics only (default depth=1)
git-planner overview --depth 2   # epics + sprints
git-planner overview --depth 3   # full hierarchy
git-planner overview --state all # include closed items
```

### Wiki

```bash
git-planner wiki init            # initialize wiki/ directory
git-planner wiki list            # list wiki markdown files
git-planner wiki show README     # show wiki/README.md content
```

---

## Typical Workflow

### Starting a new project

```bash
# 1. Create the top-level epic
git-planner epic create "User Authentication" -d "Login, registration, password reset" -p 21

# 2. Create a sprint under it (assume epic is #1)
git-planner sprint create "Auth Sprint 1" --epic 1 --start 2024-01-01 --end 2024-01-14 -p 8

# 3. Add user stories to the sprint (assume sprint is #2)
git-planner story create "Login form UI" --sprint 2 --epic 1 -p 3 --priority high
git-planner story create "JWT token handling" --sprint 2 --epic 1 -p 5 --priority high
```

### Getting an overview

```bash
# Quick status check (epics only, minimal output)
git-planner overview

# Full hierarchy
git-planner overview --depth 3

# Token-efficient list for AI context
git-planner epic list --short
git-planner sprint list --epic 1 --short
git-planner story list --sprint 2 --short
```

### Closing completed work

```bash
git-planner story update 4 --status closed
git-planner sprint update 2 --status closed
```

---

## Output Modes

| Mode | Command | Tokens |
|------|---------|--------|
| Full detail | `git-planner epic show 1` | High |
| List (full) | `git-planner epic list` | Medium |
| List (short) | `git-planner epic list --short` | Low |
| Overview depth 1 | `git-planner overview` | Very Low |
| Overview depth 3 | `git-planner overview --depth 3` | Medium |

---

## Notes for AI Agents

- Always use `--short` when you only need issue numbers and titles
- Use `overview --depth 2` to understand sprint structure before diving in
- Issue numbers are stable references — use them for cross-referencing
- The `gh` CLI must be authenticated (`gh auth login`) for any backend calls
- All `create` commands return the issue number and URL on success
