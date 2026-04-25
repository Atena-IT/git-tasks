import { Command } from 'commander';
import getBackend from '../backends/index.js';
import { buildLifecycleEdit, cascadeCloseParentsFromIssue } from '../automation/lifecycle.js';
import { sprintTemplate } from '../utils/templates.js';
import { formatIssueList, formatIssueDetail, printSuccess, printError } from '../utils/format.js';
import { getMetadataField, parseMetadataList, setMetadataListField } from '../utils/metadata.js';

function collectValues(value, previous = []) {
  return previous.concat(value);
}

export function makeSprintCommand() {
  const sprint = new Command('sprint').description('Manage sprints');

  sprint
    .command('create <title>')
    .description('Create a new sprint')
    .requiredOption('-e, --epic <epic-number>', 'Parent epic number')
    .requiredOption('-d, --description <text>', 'Sprint description')
    .requiredOption('-p, --points <n>', 'Story points')
    .requiredOption('--start <date>', 'Start date')
    .requiredOption('--end <date>', 'End date')
    .option('-a, --assignee <user>', 'Assignee username')
    .option('-k, --knowledge <path>', 'Linked knowledge document path', collectValues, [])
    .action(async (title, opts) => {
      try {
        const backend = getBackend();
        const body = sprintTemplate({
          description: opts.description,
          epicNumber: opts.epic || '',
          points: opts.points,
          start: opts.start || '',
          end: opts.end || '',
          owner: opts.assignee || '',
          knowledgeLinks: parseMetadataList(opts.knowledge),
        });
        const prefix = opts.epic ? `sprint(#${opts.epic})` : 'sprint';
        const issue = await backend.createIssue({
          title: `${prefix}: ${title}`,
          body,
          labels: ['sprint', 'status:open'],
          assignees: opts.assignee ? [opts.assignee] : [],
        });
        printSuccess(`Created sprint #${issue.number}: ${issue.url}`);
      } catch (err) {
        printError(err.message);
      }
    });

  sprint
    .command('list')
    .description('List sprints')
    .option('--epic <epic-number>', 'Filter by epic number')
    .option('--state <state>', 'Issue state: open, closed, all', 'open')
    .option('--short', 'Show minimal output')
    .action(async (opts) => {
      try {
        const backend = getBackend();
        let issues = await backend.listIssues({ labels: ['sprint'], state: opts.state });
        if (opts.epic) {
          const ref = `#${opts.epic}`;
          issues = issues.filter(i => i.title.includes(`(${ref})`) || i.title.includes(`(${opts.epic})`));
        }
        console.log(formatIssueList(issues, { short: opts.short }));
      } catch (err) {
        printError(err.message);
      }
    });

  sprint
    .command('show <number>')
    .description('Show sprint details')
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

  sprint
    .command('update <number>')
    .description('Update a sprint')
    .option('--title <text>', 'New title (raw, without prefix)')
    .option('--epic <epic-number>', 'Re-assign to epic')
    .option('--points <n>', 'Story points')
    .option('--status <state>', 'open or closed')
    .option('-k, --knowledge <path>', 'Linked knowledge document path', collectValues, [])
    .action(async (number, opts) => {
      try {
        const backend = getBackend();
        const currentIssue = await backend.viewIssue(number);
        const editOpts = {};
        let nextBody = currentIssue.body;
        if (opts.title) {
          const epicPart = opts.epic ? `(#${opts.epic})` : '';
          editOpts.title = `sprint${epicPart}: ${opts.title}`;
        }
        if (opts.status) {
          const lifecycleEdit = buildLifecycleEdit(currentIssue, opts.status);
          Object.assign(editOpts, lifecycleEdit);
          nextBody = lifecycleEdit.body;
        }
        if (opts.knowledge.length) {
          const knowledgeLinks = parseMetadataList(getMetadataField(nextBody, 'Knowledge Links'), opts.knowledge);
          editOpts.body = setMetadataListField(nextBody, 'Knowledge Links', knowledgeLinks);
        }

        const issue = await backend.editIssue(number, editOpts);
        if (opts.status === 'closed') {
          await cascadeCloseParentsFromIssue(issue, 'sprint', { backend });
        }
        printSuccess(`Updated sprint #${issue.number}`);
      } catch (err) {
        printError(err.message);
      }
    });

  return sprint;
}
