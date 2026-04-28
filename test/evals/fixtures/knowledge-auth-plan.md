---
id: k-auth-rollout-plan
type: decision
title: Split auth rollout into reviewable stories
timestamp: 2026-04-23T09:54:02Z
status: accepted
tags:
  - auth
  - planning
sources:
  - .git-tasks/wiki/inbox/meeting-notes.md
issue-refs:
  - "#12"
  - "#27"
neighbours:
  - id: k-session-token-compliance
    relation: constrained-by
supersedes: []
---

## Context/Source
The team wants auth work split into reviewable, agent-sized stories with clear audit links.

## Interpretation
A single auth rewrite is too large for one short sprint and should be decomposed.

## Planning changes
Create or update a short auth epic, a sprint scoped to the rollout, and stories for login, logout, password reset, and SSO.

## Rationale
This keeps execution auditable and lets each story move through the draft-PR lifecycle independently.

## Consequences
Each affected backlog item should store a `Knowledge Links` reference back to this node.
