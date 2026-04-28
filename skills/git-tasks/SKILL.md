---
name: git-tasks
description: AI-native project management CLI for GitHub. Use when the user wants to inspect or update the planning hierarchy (epics, sprints, user stories), drive story lifecycle transitions (start work, ready for review, close), or compile inbound notes, transcripts, uploads, and feature requests into structured wiki knowledge before changing the plan. Do not use for reading a single issue or PR without project-management intent; prefer standard gh commands for those one-off lookups. Triggers include "what's the current sprint status", "create a story for this feature", "move this story to in-progress", "close out the sprint", "update the plan based on today's meeting notes", or any request involving epics, sprints, story lifecycle, or wiki-backed planning updates.
allowed-tools: Bash(git-tasks:*), Bash(npx @atena-reply/git-tasks:*)
hidden: true
---

# git-tasks

**Use when** you are acting as an AI project manager — inspecting or updating epics, sprints, and user stories, driving story lifecycle transitions, or translating inbound inputs (meeting notes, feature requests, transcripts, uploaded files) into structured project-plan changes.

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
- Run `git-tasks init` at the repository root if `.git-tasks/wiki/` is missing.
- If `.git-tasks/config.json` exists, read it before planning. Use `planningHorizons` as repo-specific sizing guidance and `defaultReviewers` (or `owner`) as the default review handoff target.
- If `.git-tasks/wiki/knowledge/index.md` exists, read it before opening individual knowledge nodes.
- If the repo still has legacy `wiki/raw/` or `wiki/processed/` content, it is fine to read it for historical context, but write new material into `.git-tasks/wiki/inbox/` and `.git-tasks/wiki/knowledge/`.
- If the repo is being initialized for the first time, prefer `git-tasks init --owner <user> --reviewer <user>` so the repo contract is explicit from the start.
- Start with `git-tasks overview --depth 2` before drilling into individual issues.
- Install the skill anywhere with `npx @atena-reply/git-tasks skill install --target all`.

## AI-native planning granularity

- **Stories** are agent-sized atomic units: large enough for one coding agent to finish independently, but usually no more than a few hours to one day.
- **Sprints** should usually span no more than three days.
- **Epics** should usually span no more than two weeks.
- If `.git-tasks/config.json` defines `planningHorizons`, treat those values as repo-specific overrides for the default sizing guidance above.
- Keep dependencies explicit and current: every story should point at its sprint and epic, and every sprint should point at its epic.

## Recommended workflow

1. Initialize the repository once with `git-tasks init`.
2. If the user gives you notes in chat or hands you uploaded files, capture the inbound material in `.git-tasks/wiki/inbox/` first.
3. If inbound material is already on disk, treat `.git-tasks/wiki/inbox/` as the intake layer and preserve the source wording there.
4. Read `.git-tasks/wiki/knowledge/index.md` before planning so you reuse or refine existing knowledge instead of creating duplicates.
5. Update or create knowledge nodes in `.git-tasks/wiki/knowledge/` only when durable understanding changes.
6. After the knowledge layer is current, inspect and update epics, sprints, and stories.
7. Use issue `Knowledge Links` metadata whenever backlog items are tied to specific knowledge docs.
8. Use `show` only when you need full body text or comments.

Keep `.git-tasks/wiki/knowledge/` flat. The semantic kind belongs in frontmatter `type`, not in subdirectories.
Use dash-case frontmatter keys. A practical minimum is:
- `id`
- `type`
- `title`
- `timestamp`
- `status`
- `tags`
- `sources`
- `issue-refs`
- `neighbours`
- `supersedes`

Keep the body focused on human-readable reasoning. Each knowledge node should normally include:
- **Context/Source:** what changed or arrived
- **Interpretation:** the durable understanding extracted from it
- **Planning changes:** the backlog changes that should follow, if any
- **Rationale:** why that decomposition or update is the right one
- **Consequences:** downstream effects or follow-up implications

## Core commands

### Create

```bash
git-tasks epic create "Epic title" -d "description" -p 13 --start YYYY-MM-DD --end YYYY-MM-DD --knowledge .git-tasks/wiki/knowledge/example.md
git-tasks sprint create "Sprint title" --epic <n> -d "description" -p 8 --start YYYY-MM-DD --end YYYY-MM-DD --knowledge .git-tasks/wiki/knowledge/example.md
git-tasks story create "Story title" --sprint <n> --epic <n> -d "description" -p 3 --priority high -a <username> --knowledge .git-tasks/wiki/knowledge/example.md
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
git-tasks epic update <n> --status closed --knowledge .git-tasks/wiki/knowledge/example.md
git-tasks sprint update <n> --status closed --knowledge .git-tasks/wiki/knowledge/example.md
git-tasks story update <n> --status in-progress --knowledge .git-tasks/wiki/knowledge/example.md
git-tasks story update <n> --status ready-for-review --reviewer octocat
git-tasks story update <n> --status closed
git-tasks story update <n> -a <username>
```

### Wiki

```bash
git-tasks init
git-tasks wiki list
git-tasks wiki show inbox/<filename>
git-tasks wiki show knowledge/index
```

## Title conventions

- Epic: `epic: <title>`
- Sprint: `sprint(#<epic-number>): <title>`
- User story: `story(#<sprint-number>): <title>`

## Lifecycle boundaries and output guidance

- Read `.git-tasks/wiki/knowledge/index.md` first, then open only the relevant knowledge files.
- New material in `.git-tasks/wiki/inbox/` by itself does **not** justify creating or updating issues, branches, or pull requests.
- New or updated knowledge that changes the plan **may** justify epic/sprint/story create or update operations.
- Use `overview` for context and `list --short` for low-token discovery.
- Use `show --comments` only when comments matter.
- Reuse returned issue numbers as stable references.
- When backlog items are tied to knowledge docs, record those links in issue `Knowledge Links` metadata and mirror the issue numbers back into knowledge frontmatter `issue-refs`.
- When a story is picked up, work from an isolated worktree with a named branch and attached draft PR.
- Routine execution should follow the existing story lifecycle; do not create new knowledge nodes unless durable understanding or planning changed.
- When moving a story to `ready-for-review`, make sure the draft PR is promoted and review is requested from `--reviewer` when explicitly provided, otherwise `GIT_TASKS_REVIEWERS`, otherwise `.git-tasks/config.json` `defaultReviewers`, falling back to `owner`.
- Branches and draft PRs are execution artifacts for stories, not wiki entities.
- Treat worktrees, PR logs, and review handoff as required operating discipline even when your host does not automate them yet; if your agent host supports hooks, that is the right layer to enforce them.
