---
name: git-tasks
description: AI-native project management CLI for GitHub. Use when the user wants to inspect or update the planning hierarchy (epics, sprints, user stories), drive story lifecycle transitions (start work, ready for review, close), or integrate raw inputs such as client meeting notes or feature transcripts into the existing plan — either by updating open items or creating new ones as a diff. Do not use for reading a single issue or PR without any project-management intent; prefer standard gh commands for those one-off lookups. Triggers include "what's the current sprint status", "create a story for this feature", "move this story to in-progress", "close out the sprint", "update the plan based on today's meeting notes", or any request involving epics, sprints, or story lifecycle management.
allowed-tools: Bash(git-tasks:*), Bash(npx @atena-reply/git-tasks:*)
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

- Ensure `gh auth status` succeeds.
- Prefer `--short` output unless you need full issue bodies or comments.
- Run `git-tasks wiki init` in the repository if `wiki/` is missing.
- Start with `git-tasks overview --depth 2` before drilling into individual issues.
- Install the skill anywhere with `npx @atena-reply/git-tasks skill install --target all`.

## AI-native planning granularity

- **Stories** are agent-sized atomic units: large enough for one coding agent to finish independently, but usually no more than a few hours to one day.
- **Sprints** should usually span no more than three days.
- **Epics** should usually span no more than two weeks.
- Keep dependencies explicit and current: every story should point at its sprint and epic, and every sprint should point at its epic.

## Recommended workflow

1. Initialize and use the wiki as the audit source of truth with `git-tasks wiki init`.
2. If the user gives you notes in chat, dump them first into `wiki/raw/`.
3. If the user already dropped notes into the wiki, read from `wiki/raw/` first.
4. Before decomposing work or changing epics, sprints, or stories, write a new timestamped markdown file into `wiki/processed/` summarizing the interpreted knowledge and intended PM changes.
5. Inspect the hierarchy with `git-tasks overview --depth 2`.
6. Find the right epic with `git-tasks epic list --short`.
7. Find the right sprint with `git-tasks sprint list --epic <n> --short`.
8. Inspect or update stories with `git-tasks story list --sprint <n> --short`.
9. Use `show` only when you need full body text or comments.

Treat `wiki/processed/` as append-only and ordered by arrival time using timestamp-prefixed filenames.

## Core commands

### Create

```bash
git-tasks epic create "Epic title" -d "description" -p 13 --start YYYY-MM-DD --end YYYY-MM-DD
git-tasks sprint create "Sprint title" --epic <n> -d "description" -p 8 --start YYYY-MM-DD --end YYYY-MM-DD
git-tasks story create "Story title" --sprint <n> --epic <n> -d "description" -p 3 --priority high -a <username>
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
git-tasks wiki show raw/<filename>
git-tasks wiki show processed/<timestamped-filename>
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
- When a story is picked up, work from an isolated worktree with a named branch and attached draft PR.
- Log meaningful units of work in both the draft PR and `wiki/processed/` so the execution trail remains auditable.
- When moving a story to `ready-for-review`, make sure the draft PR is promoted and review is requested from the repository owner or default reviewers.
