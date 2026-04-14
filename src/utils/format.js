import chalk from 'chalk';

/**
 * Parse an issue title to determine its type and extract refs.
 * Returns { type: 'epic'|'sprint'|'story'|'unknown', ref: string|null, title: string }
 */
export function parseIssueTitle(rawTitle) {
  if (!rawTitle) return { type: 'unknown', ref: null, title: rawTitle };

  const epicMatch = rawTitle.match(/^epic:\s*(.+)$/i);
  if (epicMatch) return { type: 'epic', ref: null, title: epicMatch[1].trim() };

  const sprintMatch = rawTitle.match(/^sprint\(([^)]+)\):\s*(.+)$/i);
  if (sprintMatch) return { type: 'sprint', ref: sprintMatch[1].trim(), title: sprintMatch[2].trim() };

  const storyMatch = rawTitle.match(/^us\(([^)]+)\):\s*(.+)$/i);
  if (storyMatch) return { type: 'story', ref: storyMatch[1].trim(), title: storyMatch[2].trim() };

  return { type: 'unknown', ref: null, title: rawTitle };
}

/**
 * Format a single issue for display.
 */
export function formatIssue(issue, { short = false } = {}) {
  const parsed = parseIssueTitle(issue.title);
  const typeColors = { epic: chalk.magenta, sprint: chalk.blue, story: chalk.green, unknown: chalk.white };
  const colorFn = typeColors[parsed.type] || chalk.white;
  const stateIcon = issue.state === 'CLOSED' ? chalk.gray('✗') : chalk.green('○');

  if (short) {
    return `${stateIcon} #${issue.number} ${colorFn(issue.title)}`;
  }

  const lines = [
    `${stateIcon} ${chalk.bold(`#${issue.number}`)} ${colorFn(issue.title)}`,
    `   ${chalk.gray('State:')} ${issue.state}`,
  ];
  if (issue.labels?.length) {
    lines.push(`   ${chalk.gray('Labels:')} ${issue.labels.map(l => l.name || l).join(', ')}`);
  }
  if (issue.assignees?.length) {
    lines.push(`   ${chalk.gray('Assignees:')} ${issue.assignees.map(a => a.login || a).join(', ')}`);
  }
  if (issue.createdAt) {
    lines.push(`   ${chalk.gray('Created:')} ${new Date(issue.createdAt).toLocaleDateString()}`);
  }
  return lines.join('\n');
}

/**
 * Format a list of issues.
 */
export function formatIssueList(issues, { short = false } = {}) {
  if (!issues.length) return chalk.gray('No issues found.');
  return issues.map(i => formatIssue(i, { short })).join('\n');
}

/**
 * Format full issue detail view.
 */
export function formatIssueDetail(issue, { comments = false } = {}) {
  const parsed = parseIssueTitle(issue.title);
  const typeColors = { epic: chalk.magenta, sprint: chalk.blue, story: chalk.green, unknown: chalk.white };
  const colorFn = typeColors[parsed.type] || chalk.white;

  const lines = [
    chalk.bold(`#${issue.number} `) + colorFn(issue.title),
    chalk.gray('─'.repeat(60)),
    `${chalk.gray('State:')}     ${issue.state}`,
    `${chalk.gray('Type:')}      ${parsed.type}`,
  ];
  if (issue.labels?.length) {
    lines.push(`${chalk.gray('Labels:')}    ${issue.labels.map(l => l.name || l).join(', ')}`);
  }
  if (issue.assignees?.length) {
    lines.push(`${chalk.gray('Assignees:')} ${issue.assignees.map(a => a.login || a).join(', ')}`);
  }
  if (issue.url) lines.push(`${chalk.gray('URL:')}       ${issue.url}`);
  if (issue.createdAt) lines.push(`${chalk.gray('Created:')}   ${new Date(issue.createdAt).toLocaleString()}`);
  if (issue.updatedAt) lines.push(`${chalk.gray('Updated:')}   ${new Date(issue.updatedAt).toLocaleString()}`);

  lines.push('');
  lines.push(chalk.gray('─'.repeat(60)));
  lines.push(issue.body || chalk.italic('No description.'));

  if (comments && issue.comments?.nodes?.length) {
    lines.push('');
    lines.push(chalk.bold('Comments:'));
    lines.push(chalk.gray('─'.repeat(60)));
    for (const c of issue.comments.nodes) {
      lines.push(`${chalk.cyan(c.author?.login || 'unknown')} ${chalk.gray(new Date(c.createdAt).toLocaleString())}`);
      lines.push(c.body);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format hierarchical overview output.
 */
export function formatOverview(epics, { depth = 1 } = {}) {
  if (!epics.length) return chalk.gray('No epics found.');

  const lines = [];
  for (const epic of epics) {
    const stateIcon = epic.state === 'CLOSED' ? chalk.gray('✗') : chalk.green('○');
    lines.push(`${stateIcon} ${chalk.magenta.bold(`#${epic.number}`)} ${chalk.magenta(epic.title)}`);

    if (depth >= 2 && epic.sprints?.length) {
      for (const sprint of epic.sprints) {
        const sIcon = sprint.state === 'CLOSED' ? chalk.gray('✗') : chalk.green('○');
        lines.push(`  ${sIcon} ${chalk.blue.bold(`#${sprint.number}`)} ${chalk.blue(sprint.title)}`);

        if (depth >= 3 && sprint.stories?.length) {
          for (const story of sprint.stories) {
            const uIcon = story.state === 'CLOSED' ? chalk.gray('✗') : chalk.green('○');
            lines.push(`    ${uIcon} ${chalk.green.bold(`#${story.number}`)} ${chalk.green(story.title)}`);
          }
        }
      }
    }
  }
  return lines.join('\n');
}

/**
 * Print an error message and optionally exit.
 */
export function printError(msg, exitCode = 1) {
  console.error(chalk.red(`✗ ${msg}`));
  if (exitCode !== null) process.exit(exitCode);
}

/**
 * Print a success message.
 */
export function printSuccess(msg) {
  console.log(chalk.green(`✓ ${msg}`));
}

/**
 * Print an info message.
 */
export function printInfo(msg) {
  console.log(chalk.cyan(`ℹ ${msg}`));
}
