import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { printError } from '../utils/format.js';
import chalk from 'chalk';

const WIKI_DIR = 'wiki';
const INBOX_DIR = 'inbox';
const KNOWLEDGE_DIR = 'knowledge';

const WIKI_README = `# Project Wiki

This wiki contains project knowledge managed by git-tasks.

## Structure

- \`wiki/inbox/\` is for direct human or system inputs such as meeting notes, transcripts, pasted chats, and scratch notes.
- \`wiki/knowledge/\` is for structured knowledge nodes whose semantic type lives in frontmatter.
- \`wiki/knowledge/index.md\` is the append-only encyclopedia index that AI agents should scan first before opening individual knowledge files.
- Keep legacy \`wiki/raw/\` and \`wiki/processed/\` folders readable if they already exist, but write new material into \`wiki/inbox/\` and \`wiki/knowledge/\`.
- Use \`git-tasks wiki list\` to list files recursively.
- Use \`git-tasks wiki show <filename>\` to view a file, including nested paths such as \`inbox/discovery.md\` or \`knowledge/index.md\`.
`;

const INBOX_WIKI_README = `# Inbox

Use this space for unmodified incoming material from humans or external systems.

- Drop notes exactly as they arrive.
- Preserve original wording when possible.
- Inbox entries alone should not trigger issue, branch, or pull-request changes until the knowledge has been compiled into \`wiki/knowledge/\`.
`;

const KNOWLEDGE_WIKI_README = `# Knowledge

Use this space for durable knowledge nodes managed by AI and humans.

- Keep files flat in this directory; use frontmatter \`type\` rather than subdirectories to express whether a node is a decision, plan, constraint, observation, procedure, or something else.
- Use dash-case frontmatter keys such as \`timestamp\`, \`issue-refs\`, and \`neighbours\`.
- Update or create knowledge nodes when durable understanding changes.
- Update \`index.md\` whenever knowledge changes so agents can navigate the wiki efficiently.
- Legacy \`processed/\` content may still be read, but new durable knowledge belongs here.
`;

const KNOWLEDGE_INDEX = `# Knowledge Index

Append new knowledge entries in arrival order using this format:

- \`<timestamp> | <type> | [Title](file.md) — short description\`

Agents should scan this index first, then open only the relevant knowledge nodes.
`;

function listMarkdownFiles(dir, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function getWikiRoot(rootDir = process.cwd()) {
  return resolve(rootDir, WIKI_DIR);
}

export function initializeWiki(rootDir = process.cwd()) {
  const wikiRoot = getWikiRoot(rootDir);
  const files = [
    [join(wikiRoot, 'README.md'), WIKI_README],
    [join(wikiRoot, INBOX_DIR, 'README.md'), INBOX_WIKI_README],
    [join(wikiRoot, KNOWLEDGE_DIR, 'README.md'), KNOWLEDGE_WIKI_README],
    [join(wikiRoot, KNOWLEDGE_DIR, 'index.md'), KNOWLEDGE_INDEX],
  ];
  const createdPaths = [];

  mkdirSync(wikiRoot, { recursive: true });
  for (const [filePath, contents] of files) {
    mkdirSync(dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) {
      writeFileSync(filePath, contents, 'utf8');
      createdPaths.push(filePath);
    }
  }

  return { createdPaths, wikiRoot };
}

function resolveWikiFilePath(filename, rootDir = process.cwd()) {
  const wikiRoot = getWikiRoot(rootDir);
  const requested = filename.endsWith('.md') ? filename : `${filename}.md`;
  const filePath = resolve(wikiRoot, requested);
  const relativePath = relative(wikiRoot, filePath);
  if (!relativePath || relativePath.startsWith('..')) {
    throw new Error('Wiki paths must stay inside the wiki/ directory.');
  }
  return filePath;
}

export function makeWikiCommand() {
  const wiki = new Command('wiki').description('Manage local wiki files for inbox inputs and structured knowledge');

  wiki
    .command('list')
    .description('List wiki markdown files recursively')
    .action(() => {
      try {
        if (!existsSync(WIKI_DIR)) {
          console.log(chalk.yellow('Wiki not initialized. Run: git-tasks init'));
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
    .description('Show the content of a wiki file, including nested inbox/ or knowledge/ paths')
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
