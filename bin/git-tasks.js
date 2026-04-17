#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import { makeEpicCommand } from '../src/commands/epic.js';
import { makeSprintCommand } from '../src/commands/sprint.js';
import { makeStoryCommand } from '../src/commands/story.js';
import { makeOverviewCommand } from '../src/commands/overview.js';
import { makeSkillCommand } from '../src/commands/skill.js';
import { makeWikiCommand } from '../src/commands/wiki.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('git-tasks')
  .description('AI-native GitHub issue planning via epics, sprints, and user stories')
  .version(pkg.version);

program.addCommand(makeEpicCommand());
program.addCommand(makeSprintCommand());
program.addCommand(makeStoryCommand());
program.addCommand(makeOverviewCommand());
program.addCommand(makeSkillCommand());
program.addCommand(makeWikiCommand());

program.parse(process.argv);
