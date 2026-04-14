/**
 * Backend factory. Supports swapping GitHub for other backends (e.g., GitLab).
 *
 * Backend interface — each backend must implement:
 *   createIssue({ title, body, labels, assignees }) → { number, url, title }
 *   listIssues({ labels, state, limit }) → Issue[]
 *   viewIssue(number, { comments }) → Issue
 *   editIssue(number, { title, body, addLabels, removeLabels, addAssignees, state }) → Issue
 */

import githubBackend from './github.js';

const BACKENDS = {
  github: githubBackend,
};

/**
 * Returns the backend instance by name.
 * @param {string} name - Backend name (default: 'github')
 */
export function getBackend(name = 'github') {
  const backend = BACKENDS[name];
  if (!backend) {
    throw new Error(`Unknown backend: "${name}". Available: ${Object.keys(BACKENDS).join(', ')}`);
  }
  return backend;
}

export default getBackend;
