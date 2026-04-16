import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { printSuccess, printError } from '../utils/format.js';
import chalk from 'chalk';

const WIKI_DIR = 'wiki';

const WIKI_README = `# Project Wiki

This wiki contains project documentation managed by git-tasks.

## Structure

- Add markdown files to this directory for project documentation.
- Use \`git-tasks wiki list\` to list files.
- Use \`git-tasks wiki show <filename>\` to view a file.
`;

export function makeWikiCommand() {
  const wiki = new Command('wiki').description('Manage local wiki files');

  wiki
    .command('init')
    .description('Initialize the wiki/ directory with a README.md')
    .action(() => {
      try {
        if (!existsSync(WIKI_DIR)) {
          mkdirSync(WIKI_DIR, { recursive: true });
        }
        const readmePath = join(WIKI_DIR, 'README.md');
        if (!existsSync(readmePath)) {
          writeFileSync(readmePath, WIKI_README, 'utf8');
          printSuccess(`Created ${readmePath}`);
        } else {
          console.log(chalk.yellow(`Wiki already initialized at ${readmePath}`));
        }
      } catch (err) {
        printError(err.message);
      }
    });

  wiki
    .command('list')
    .description('List wiki files')
    .action(() => {
      try {
        if (!existsSync(WIKI_DIR)) {
          console.log(chalk.yellow('Wiki not initialized. Run: git-tasks wiki init'));
          return;
        }
        const files = readdirSync(WIKI_DIR).filter(f => f.endsWith('.md'));
        if (!files.length) {
          console.log(chalk.gray('No wiki files found.'));
        } else {
          files.forEach(f => console.log(chalk.cyan(`  ${f}`)));
        }
      } catch (err) {
        printError(err.message);
      }
    });

  wiki
    .command('show <filename>')
    .description('Show the content of a wiki file')
    .action((filename) => {
      try {
        const filePath = join(WIKI_DIR, filename.endsWith('.md') ? filename : `${filename}.md`);
        if (!existsSync(filePath)) {
          printError(`Wiki file not found: ${filePath}`);
          return;
        }
        const content = readFileSync(filePath, 'utf8');
        console.log(content);
      } catch (err) {
        printError(err.message);
      }
    });

  return wiki;
}
