import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import chalk from 'chalk';
import { printError, printSuccess } from '../utils/format.js';
import { initializeWiki } from './wiki.js';

function isGitRepositoryRoot(rootDir = process.cwd()) {
  try {
    const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return resolve(topLevel) === resolve(rootDir);
  } catch {
    return false;
  }
}

export function makeInitCommand() {
  return new Command('init')
    .description('Initialize git-tasks in the current git repository')
    .action(() => {
      try {
        if (!isGitRepositoryRoot()) {
          throw new Error('git-tasks init must be run from the root of a git repository.');
        }

        const { createdPaths, wikiRoot } = initializeWiki();
        if (!createdPaths.length) {
          console.log(chalk.yellow(`git-tasks already initialized at ${wikiRoot}`));
          return;
        }

        printSuccess(`Initialized git-tasks at ${wikiRoot}`);
      } catch (err) {
        printError(err.message);
      }
    });
}
