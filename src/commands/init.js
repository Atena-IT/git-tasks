import { existsSync, realpathSync } from 'fs';
import { Command } from 'commander';
import { resolve } from 'path';
import chalk from 'chalk';
import { printError, printSuccess } from '../utils/format.js';
import { parseReviewerList } from '../utils/metadata.js';
import { getConfigPath, loadConfig, resolveRepositoryRoot, saveConfig } from '../utils/config.js';
import { initializeWiki } from './wiki.js';

function collectValues(value, previous = []) {
  return previous.concat(value);
}

function isGitRepositoryRoot(rootDir = process.cwd()) {
  const topLevel = resolveRepositoryRoot(rootDir);
  if (!topLevel) return false;

  const realpath = realpathSync.native || realpathSync;
  return realpath(resolve(topLevel)) === realpath(resolve(rootDir));
}

export function makeInitCommand() {
  return new Command('init')
    .description('Initialize git-tasks in the current git repository')
    .option('--owner <user>', 'Repository owner or default reviewer username')
    .option('-r, --reviewer <user>', 'Default reviewer username', collectValues, [])
    .action((opts) => {
      try {
        const rootDir = process.cwd();
        if (!isGitRepositoryRoot(rootDir)) {
          throw new Error('git-tasks init must be run from the root of a git repository.');
        }

        const { createdPaths, wikiRoot } = initializeWiki(rootDir);
        const configPath = getConfigPath(rootDir);
        const configExists = existsSync(configPath);
        const current = loadConfig(rootDir);
        const next = {
          ...current,
          owner: opts.owner ?? current.owner,
          defaultReviewers: opts.reviewer.length
            ? parseReviewerList(current.defaultReviewers, opts.reviewer)
            : current.defaultReviewers,
        };
        const configChanged = !configExists || JSON.stringify(next) !== JSON.stringify(current);

        if (configChanged) {
          saveConfig(next, rootDir);
        }

        if (!createdPaths.length && !configChanged) {
          console.log(chalk.yellow(`git-tasks already initialized at ${wikiRoot}`));
          return;
        }

        if (createdPaths.length || !configExists) {
          printSuccess(`Initialized git-tasks at ${wikiRoot}`);
          return;
        }

        printSuccess(`Updated git-tasks config at ${configPath}`);
      } catch (err) {
        printError(err.message);
      }
    });
}
