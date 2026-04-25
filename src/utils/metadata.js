function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDelimitedList(...values) {
  return [...new Set(values
    .flat()
    .flatMap((value) => value == null ? [] : String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean))];
}

export function getMetadataField(body = '', field) {
  const pattern = new RegExp(`^- \\*\\*${escapeRegex(field)}:\\*\\*\\s*(.*)$`, 'mi');
  const match = body.match(pattern);
  return match ? match[1].trim() : null;
}

export function setMetadataField(body = '', field, value) {
  const safeBody = body || '';
  const line = `- **${field}:** ${value ?? ''}`;
  const pattern = new RegExp(`^- \\*\\*${escapeRegex(field)}:\\*\\*\\s*.*$`, 'mi');

  if (pattern.test(safeBody)) {
    return safeBody.replace(pattern, line);
  }

  if (!safeBody.includes('## Metadata')) {
    return `${safeBody.trimEnd()}\n\n## Metadata\n${line}\n`;
  }

  return safeBody.replace(/## Metadata\s*\n/i, (heading) => `${heading}${line}\n`);
}

export function setMetadataListField(body = '', field, values = []) {
  const normalized = parseDelimitedList(values);
  return setMetadataField(body, field, normalized.join(', '));
}

export function normalizeLifecycleStatus(status = 'open') {
  const normalized = String(status).trim().toLowerCase();
  const aliases = new Map([
    ['open', 'open'],
    ['todo', 'open'],
    ['running', 'in-progress'],
    ['in-progress', 'in-progress'],
    ['in_progress', 'in-progress'],
    ['working', 'in-progress'],
    ['ready', 'ready-for-review'],
    ['review', 'ready-for-review'],
    ['in-review', 'ready-for-review'],
    ['ready-for-review', 'ready-for-review'],
    ['ready_for_review', 'ready-for-review'],
    ['closed', 'closed'],
    ['done', 'closed'],
  ]);

  if (!aliases.has(normalized)) {
    throw new Error(`Unsupported lifecycle status: ${status}`);
  }

  return aliases.get(normalized);
}

export function parseMetadataList(...values) {
  return parseDelimitedList(...values);
}

export function parseReviewerList(...values) {
  return parseDelimitedList(...values);
}

export function parsePullRequestReference(value = '') {
  const raw = String(value).trim();
  if (!raw) return null;

  const urlMatch = raw.match(/\/pull\/(\d+)(?:\/?|$)/);
  if (urlMatch) {
    return { number: Number(urlMatch[1]), url: raw };
  }

  const numberMatch = raw.match(/^#?(\d+)$/);
  if (numberMatch) {
    return { number: Number(numberMatch[1]), url: null };
  }

  return { number: null, url: raw };
}
