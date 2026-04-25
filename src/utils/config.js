import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { parseReviewerList } from './metadata.js';

export const DEFAULT_PLANNING_HORIZONS = Object.freeze({
  storyMaxDays: 1,
  sprintMaxDays: 3,
  epicMaxWeeks: 2,
});

function normalizePlanningHorizons(planningHorizons = {}) {
  return {
    ...DEFAULT_PLANNING_HORIZONS,
    ...(planningHorizons || {}),
  };
}

export function normalizeConfig(config = {}) {
  return {
    owner: String(config.owner || '').trim(),
    defaultReviewers: parseReviewerList(config.defaultReviewers || []),
    planningHorizons: normalizePlanningHorizons(config.planningHorizons),
  };
}

function resolveRealPath(targetPath) {
  const realpath = realpathSync.native || realpathSync;
  return realpath(resolve(targetPath));
}

export function resolveRepositoryRoot(rootDir = process.cwd()) {
  try {
    const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return resolveRealPath(topLevel);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('git is not installed or not found in PATH.');
    }
    if (typeof error?.status === 'number') {
      return null;
    }
    throw error;
  }
}

export function getConfigPath(rootDir = process.cwd()) {
  const repoRoot = resolveRepositoryRoot(rootDir) || resolve(rootDir);
  return resolve(repoRoot, '.git-tasks', 'config.json');
}

export function loadConfig(rootDir = process.cwd()) {
  const configPath = getConfigPath(rootDir);
  if (!existsSync(configPath)) {
    return normalizeConfig();
  }

  try {
    return normalizeConfig(JSON.parse(readFileSync(configPath, 'utf8')));
  } catch (error) {
    throw new Error(`Unable to parse git-tasks config at ${configPath}: ${error.message}`);
  }
}

export function saveConfig(config = {}, rootDir = process.cwd()) {
  const configPath = getConfigPath(rootDir);
  const normalized = normalizeConfig(config);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return { config: normalized, configPath };
}
