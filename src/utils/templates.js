/**
 * Issue body templates for epics, sprints, and user stories.
 */

function formatKnowledgeLinks(knowledgeLinks = []) {
  return knowledgeLinks.join(', ');
}

export function epicTemplate({ description = '', points = 0, start = '', end = '', owner = '', knowledgeLinks = [] } = {}) {
  return `## Description
${description || '<!-- Epic description -->'}

## Goals
<!-- What does this epic achieve? -->

## Acceptance Criteria
- [ ] criterion 1

## Metadata
- **Status:** open
- **Story Points:** ${points}
- **Start Date:** ${start}
- **End Date:** ${end}
- **Owner:** ${owner}
- **Knowledge Links:** ${formatKnowledgeLinks(knowledgeLinks)}

## Child Sprints
<!-- Will be auto-populated -->

## Dependencies
<!-- List blocking epics/issues -->

## Notes
<!-- Additional notes -->
`;
}

export function sprintTemplate({ description = '', epicNumber = '', points = 0, start = '', end = '', owner = '', knowledgeLinks = [] } = {}) {
  return `## Description
${description || '<!-- Sprint description -->'}

## Sprint Goal
<!-- What does this sprint achieve? -->

## Acceptance Criteria
- [ ] criterion 1

## Metadata
- **Status:** open
- **Story Points:** ${points}
- **Start Date:** ${start}
- **End Date:** ${end}
- **Epic:** ${epicNumber ? `#${epicNumber}` : ''}
- **Owner:** ${owner}
- **Knowledge Links:** ${formatKnowledgeLinks(knowledgeLinks)}

## User Stories
<!-- Will be auto-populated -->

## Blockers
<!-- List blocking issues -->

## Notes
`;
}

export function storyTemplate({ description = '', sprintNumber = '', epicNumber = '', points = 1, assignee = '', priority = 'medium', knowledgeLinks = [] } = {}) {
  return `## Description
${description || '<!-- User story description -->'}

## As a...
<!-- As a <role>, I want <goal>, so that <benefit> -->

## Acceptance Criteria
- [ ] criterion 1

## Metadata
- **Status:** open
- **Story Points:** ${points}
- **Sprint:** ${sprintNumber ? `#${sprintNumber}` : ''}
- **Epic:** ${epicNumber ? `#${epicNumber}` : ''}
- **Assignee:** ${assignee}
- **Priority:** ${priority}
- **Knowledge Links:** ${formatKnowledgeLinks(knowledgeLinks)}
- **Linked PR:**

## Tasks
- [ ] task 1

## Blockers
<!-- List blocking issues -->

## Notes
`;
}
