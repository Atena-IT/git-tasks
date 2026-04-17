import { Command } from 'commander';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { printError, printSuccess } from '../utils/format.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_SOURCE = resolve(__dirname, '..', '..', 'skills', 'git-tasks', 'SKILL.md');
const TARGETS = {
  claude: '.claude/commands/git-tasks.md',
  copilot: '.github/skills/git-tasks/SKILL.md',
  codex: '.codex/skills/git-tasks.md',
  gemini: '.gemini/skills/git-tasks.md',
  cline: '.clinerules/git-tasks.md',
};

function collectValues(value, previous = []) {
  return previous.concat(value);
}

function expandTargets(targets = []) {
  const requested = targets.length ? targets : ['all'];
  if (requested.includes('all')) return Object.keys(TARGETS);

  const unknown = requested.filter((target) => !TARGETS[target]);
  if (unknown.length) {
    throw new Error(`Unknown skill target(s): ${unknown.join(', ')}`);
  }

  return [...new Set(requested)];
}

export function makeSkillCommand() {
  const skill = new Command('skill').description('Install agent skill files');

  skill
    .command('install')
    .description('Install the git-tasks skill into one or more agent directories')
    .option('-t, --target <name>', 'Target agent (claude, copilot, codex, gemini, cline, all)', collectValues, [])
    .option('--cwd <path>', 'Directory where skill files should be installed', process.cwd())
    .action((opts) => {
      try {
        const skillBody = readFileSync(SKILL_SOURCE, 'utf8');
        const installRoot = resolve(opts.cwd);
        const installedTargets = [];

        for (const target of expandTargets(opts.target)) {
          const destination = join(installRoot, TARGETS[target]);
          mkdirSync(dirname(destination), { recursive: true });
          writeFileSync(destination, skillBody, 'utf8');
          installedTargets.push(target);
        }

        printSuccess(`Installed git-tasks skill for: ${installedTargets.join(', ')}`);
      } catch (err) {
        printError(err.message);
      }
    });

  return skill;
}
