import { Command } from 'commander';
import getBackend from '../backends/index.js';
import { buildLifecycleEdit } from '../automation/lifecycle.js';
import { epicTemplate } from '../utils/templates.js';
import { formatIssueList, formatIssueDetail, printSuccess, printError } from '../utils/format.js';

export function makeEpicCommand() {
  const epic = new Command('epic').description('Manage epics');

  epic
    .command('create <title>')
    .description('Create a new epic')
    .option('-d, --description <text>', 'Epic description')
    .option('-p, --points <n>', 'Story points', '0')
    .option('--start <date>', 'Start date')
    .option('--end <date>', 'End date')
    .option('-a, --assignee <user>', 'Assignee username')
    .action(async (title, opts) => {
      try {
        const backend = getBackend();
        const body = epicTemplate({
          description: opts.description,
          points: opts.points,
          start: opts.start || '',
          end: opts.end || '',
          owner: opts.assignee || '',
        });
        const issue = await backend.createIssue({
          title: `epic: ${title}`,
          body,
          labels: ['epic', 'status:open'],
          assignees: opts.assignee ? [opts.assignee] : [],
        });
        printSuccess(`Created epic #${issue.number}: ${issue.url}`);
      } catch (err) {
        printError(err.message);
      }
    });

  epic
    .command('list')
    .description('List epics')
    .option('--state <state>', 'Issue state: open, closed, all', 'open')
    .option('--short', 'Show minimal output (numbers and titles only)')
    .action(async (opts) => {
      try {
        const backend = getBackend();
        const issues = await backend.listIssues({ labels: ['epic'], state: opts.state });
        console.log(formatIssueList(issues, { short: opts.short }));
      } catch (err) {
        printError(err.message);
      }
    });

  epic
    .command('show <number>')
    .description('Show epic details')
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

  epic
    .command('update <number>')
    .description('Update an epic')
    .option('--title <text>', 'New title (raw, without prefix)')
    .option('--points <n>', 'Story points')
    .option('--status <state>', 'open or closed')
    .option('--add-blocker <issue-number>', 'Add a blocking issue reference')
    .action(async (number, opts) => {
      try {
        const backend = getBackend();
        const currentIssue = await backend.viewIssue(number);
        const editOpts = {};
        if (opts.title) editOpts.title = `epic: ${opts.title}`;
        if (opts.status) Object.assign(editOpts, buildLifecycleEdit(currentIssue, opts.status));
        const issue = await backend.editIssue(number, editOpts);
        printSuccess(`Updated epic #${issue.number}`);
      } catch (err) {
        printError(err.message);
      }
    });

  return epic;
}
