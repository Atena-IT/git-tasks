import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { printSuccess, printError } from '../utils/format.js';
import chalk from 'chalk';

const WIKI_DIR = 'wiki';
const RAW_DIR = 'raw';
const PROCESSED_DIR = 'processed';

const WIKI_README = `# Project Wiki

This wiki contains project documentation managed by git-tasks.

## Structure

- \`wiki/raw/\` is for direct user notes, meeting dumps, transcripts, and scratch inputs.
- \`wiki/processed/\` is for AI-managed, append-only planning logs that must be created before decomposition or backlog updates.
- Timestamp processed entries so they sort by arrival time, for example \`wiki/processed/2026-04-23T09-54-02Z-story-split.md\`.
- Use \`git-tasks wiki list\` to list files recursively.
- Use \`git-tasks wiki show <filename>\` to view a file, including nested paths such as \`raw/discovery.md\`.
`;

const RAW_WIKI_README = `# Raw Notes

Use this space for unprocessed inputs from humans or external systems.

- Drop notes exactly as they arrive.
- Keep the original wording when possible.
- AI project-management flows should read from here, then write normalized conclusions into \`wiki/processed/\`.
`;

const PROCESSED_WIKI_README = `# Processed Audit Log

Use this space for AI-managed, append-only planning records.

- Write a new markdown file before decomposing work or changing epics, sprints, or stories.
- Keep entries ordered by arrival time with timestamp-prefixed filenames.
- Record the source inputs, interpretation, and resulting planning changes so audits can trace every decision.
`;

function listMarkdownFiles(dir, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolutePath = join(dir, entry.name);
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(absolutePath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function resolveWikiFilePath(filename) {
  const wikiRoot = resolve(WIKI_DIR);
  const requested = filename.endsWith('.md') ? filename : `${filename}.md`;
  const filePath = resolve(wikiRoot, requested);
  const relativePath = relative(wikiRoot, filePath);
  if (!relativePath || relativePath.startsWith('..')) {
    throw new Error('Wiki paths must stay inside the wiki/ directory.');
  }
  return filePath;
}

export function makeWikiCommand() {
  const wiki = new Command('wiki').description('Manage local wiki files for raw notes and processed audit logs');

  wiki
    .command('init')
    .description('Initialize wiki/ with raw note intake and processed audit-log folders')
    .action(() => {
      try {
        if (!existsSync(WIKI_DIR)) {
          mkdirSync(WIKI_DIR, { recursive: true });
        }
        const files = [
          [join(WIKI_DIR, 'README.md'), WIKI_README],
          [join(WIKI_DIR, RAW_DIR, 'README.md'), RAW_WIKI_README],
          [join(WIKI_DIR, PROCESSED_DIR, 'README.md'), PROCESSED_WIKI_README],
        ];
        const createdPaths = [];
        for (const [filePath, contents] of files) {
          mkdirSync(dirname(filePath), { recursive: true });
          if (!existsSync(filePath)) {
            writeFileSync(filePath, contents, 'utf8');
            createdPaths.push(filePath);
          }
        }
        if (!createdPaths.length) {
          const readmePath = join(WIKI_DIR, 'README.md');
          console.log(chalk.yellow(`Wiki already initialized at ${readmePath}`));
        } else {
          printSuccess(`Created ${createdPaths.join(', ')}`);
        }
      } catch (err) {
        printError(err.message);
      }
    });

  wiki
    .command('list')
    .description('List wiki markdown files recursively')
    .action(() => {
      try {
        if (!existsSync(WIKI_DIR)) {
          console.log(chalk.yellow('Wiki not initialized. Run: git-tasks wiki init'));
          return;
        }
        const files = listMarkdownFiles(WIKI_DIR);
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
    .description('Show the content of a wiki file, including nested raw/ or processed/ paths')
    .action((filename) => {
      try {
        const filePath = resolveWikiFilePath(filename);
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
