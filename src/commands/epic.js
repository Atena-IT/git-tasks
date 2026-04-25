import { Command } from 'commander';
import getBackend from '../backends/index.js';
import { buildLifecycleEdit } from '../automation/lifecycle.js';
import { epicTemplate } from '../utils/templates.js';
import { formatIssueList, formatIssueDetail, printSuccess, printError } from '../utils/format.js';
import { escapeRegex, getMetadataField, parseMetadataList, setMetadataField, setMetadataListField } from '../utils/metadata.js';

function collectValues(value, previous = []) {
  return previous.concat(value);
}

function appendSectionListItem(body = '', heading, value) {
  const sectionPattern = new RegExp(`(## ${escapeRegex(heading)}\\n)([\\s\\S]*?)(\\n## |$)`);
  const match = body.match(sectionPattern);
  const nextItem = `- ${value}`;

  if (!match) {
    return `${body.trimEnd()}\n\n## ${heading}\n${nextItem}\n`;
  }

  const items = match[2]
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const nextItems = items.includes(nextItem) ? items : [...items, nextItem];

  return body.replace(sectionPattern, `${match[1]}${nextItems.join('\n')}\n${match[3]}`);
}

export function makeEpicCommand() {
  const epic = new Command('epic').description('Manage epics');

  epic
    .command('create <title>')
    .description('Create a new epic')
    .requiredOption('-d, --description <text>', 'Epic description')
    .requiredOption('-p, --points <n>', 'Story points')
    .requiredOption('--start <date>', 'Start date')
    .requiredOption('--end <date>', 'End date')
    .option('-a, --assignee <user>', 'Assignee username')
    .option('-k, --knowledge <path>', 'Linked knowledge document path', collectValues, [])
    .action(async (title, opts) => {
      try {
        const backend = getBackend();
        const body = epicTemplate({
          description: opts.description,
          points: opts.points,
          start: opts.start || '',
          end: opts.end || '',
          owner: opts.assignee || '',
          knowledgeLinks: parseMetadataList(opts.knowledge),
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
    .option('-k, --knowledge <path>', 'Linked knowledge document path', collectValues, [])
    .action(async (number, opts) => {
      try {
        const backend = getBackend();
        const currentIssue = await backend.viewIssue(number);
        const editOpts = {};
        let nextBody = currentIssue.body;

        if (opts.title) editOpts.title = `epic: ${opts.title}`;
        if (opts.status) {
          const lifecycleEdit = buildLifecycleEdit(currentIssue, opts.status);
          Object.assign(editOpts, lifecycleEdit);
          nextBody = lifecycleEdit.body;
        }
        if (opts.points) {
          nextBody = setMetadataField(nextBody, 'Story Points', opts.points);
          editOpts.body = nextBody;
        }
        if (opts.addBlocker) {
          nextBody = appendSectionListItem(nextBody, 'Dependencies', `#${opts.addBlocker}`);
          editOpts.body = nextBody;
        }
        if (opts.knowledge.length) {
          const knowledgeLinks = parseMetadataList(getMetadataField(nextBody, 'Knowledge Links'), opts.knowledge);
          nextBody = setMetadataListField(nextBody, 'Knowledge Links', knowledgeLinks);
          editOpts.body = nextBody;
        }
        if (!Object.keys(editOpts).length) {
          printError('Pass at least one update option.');
          return;
        }

        const issue = await backend.editIssue(number, editOpts);
        printSuccess(`Updated epic #${issue.number}`);
      } catch (err) {
        printError(err.message);
      }
    });

  return epic;
}
