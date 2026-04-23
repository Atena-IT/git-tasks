import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { printError, printSuccess } from '../utils/format.js';
import { initializeWiki } from './wiki.js';

function hasGitRootMarker(rootDir = process.cwd()) {
  return existsSync(join(rootDir, '.git'));
}

export function makeInitCommand() {
  return new Command('init')
    .description('Initialize git-tasks in the current git repository')
    .action(() => {
      try {
        if (!hasGitRootMarker()) {
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
