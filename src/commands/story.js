import { Command } from 'commander';
import getBackend from '../backends/index.js';
import { applyStoryLifecycle } from '../automation/lifecycle.js';
import { parseReviewerList } from '../utils/metadata.js';
import { storyTemplate } from '../utils/templates.js';
import { formatIssueList, formatIssueDetail, printSuccess, printError } from '../utils/format.js';

function collectValues(value, previous = []) {
  return previous.concat(value);
}

export function makeStoryCommand() {
  const story = new Command('story').description('Manage user stories');

  story
    .command('create <title>')
    .description('Create a new user story')
    .requiredOption('-s, --sprint <sprint-number>', 'Parent sprint number')
    .requiredOption('-e, --epic <epic-number>', 'Parent epic number')
    .requiredOption('-d, --description <text>', 'Story description')
    .requiredOption('-p, --points <n>', 'Story points')
    .option('-a, --assignee <user>', 'Assignee username')
    .requiredOption('--priority <level>', 'Priority: low, medium, high')
    .action(async (title, opts) => {
      try {
        const backend = getBackend();
        const body = storyTemplate({
          description: opts.description,
          sprintNumber: opts.sprint || '',
          epicNumber: opts.epic || '',
          points: opts.points,
          assignee: opts.assignee || '',
          priority: opts.priority,
        });
        const sprintRef = opts.sprint ? `#${opts.sprint}` : '';
        const prefix = sprintRef ? `story(${sprintRef})` : 'story';
        const issue = await backend.createIssue({
          title: `${prefix}: ${title}`,
          body,
          labels: ['user-story', 'status:open'],
          assignees: opts.assignee ? [opts.assignee] : [],
        });
        printSuccess(`Created user story #${issue.number}: ${issue.url}`);
      } catch (err) {
        printError(err.message);
      }
    });

  story
    .command('list')
    .description('List user stories')
    .option('--sprint <sprint-number>', 'Filter by sprint number')
    .option('--epic <epic-number>', 'Filter by epic number')
    .option('--assignee <user>', 'Filter by assignee')
    .option('--state <state>', 'Issue state: open, closed, all', 'open')
    .option('--short', 'Show minimal output')
    .action(async (opts) => {
      try {
        const backend = getBackend();
        let issues = await backend.listIssues({ labels: ['user-story'], state: opts.state });
        if (opts.sprint) {
          const ref = `#${opts.sprint}`;
          issues = issues.filter(i => i.title.includes(`(${ref})`) || i.title.includes(`(${opts.sprint})`));
        }
        if (opts.assignee) {
          issues = issues.filter(i =>
            i.assignees?.some(a => (a.login || a) === opts.assignee)
          );
        }
        console.log(formatIssueList(issues, { short: opts.short }));
      } catch (err) {
        printError(err.message);
      }
    });

  story
    .command('show <number>')
    .description('Show user story details')
    .option('--comments', 'Include comments')
    .action(async (number, opts) => {
      try {
        const backend = getBackend();
        const issue = await backend.viewIssue(number, { comments: opts.comments });
        console.log(formatIssueDetail(issue, { comments: opts.comments }));
      } catch (err) {
        printError(err.message);
      }
    });

  story
    .command('update <number>')
    .description('Update a user story')
    .option('--title <text>', 'New title (raw, without prefix)')
    .option('--sprint <sprint-number>', 'Re-assign to sprint')
    .option('--points <n>', 'Story points')
    .option('--status <state>', 'open, in-progress, ready-for-review, or closed')
    .option('--priority <level>', 'Priority: low, medium, high')
    .option('-a, --assignee <user>', 'Add assignee')
    .option('--base <branch>', 'Base branch to use when creating a lifecycle pull request')
    .option('--head <branch>', 'Head branch to use when creating a lifecycle pull request')
    .option('-r, --reviewer <user>', 'Reviewer to request when marking ready-for-review', collectValues, [])
    .action(async (number, opts) => {
      try {
        const backend = getBackend();
        const editOpts = {};
        if (opts.title) {
          const sprintPart = opts.sprint ? `(#${opts.sprint})` : '';
          editOpts.title = `story${sprintPart}: ${opts.title}`;
        }
        if (opts.assignee) editOpts.addAssignees = [opts.assignee];
        let issue;
        if (opts.status) {
          ({ issue } = await applyStoryLifecycle(number, {
            status: opts.status,
            reviewers: parseReviewerList(opts.reviewer),
            base: opts.base,
            head: opts.head,
            backend,
          }));
          if (Object.keys(editOpts).length) {
            issue = await backend.editIssue(number, editOpts);
          }
        } else {
          issue = await backend.editIssue(number, editOpts);
        }
        printSuccess(`Updated user story #${issue.number}`);
      } catch (err) {
        printError(err.message);
      }
    });

  return story;
}
