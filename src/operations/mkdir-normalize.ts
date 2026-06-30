import type { FileOperation } from '../core/types/index.js';

const MKDIR_SEGMENT_RE = /^(?:mkdir|md)\s+/i;
const POWERSHELL_MKDIR_SEGMENT_RE = /^New-Item\b/i;
const MKDIR_FLAGS = new Set(['-p', '-parents', '--parents', '-force', '-f']);

function normalizeDirPath(dirPath: string): string {
  return dirPath
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
}

function splitCommandSegments(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    const next = command[index + 1];

    if (inQuote) {
      current += char;
      if (char === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inQuote = char;
      current += char;
      continue;
    }

    if (char === '&' && next === '&') {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      index += 1;
      continue;
    }

    if (char === ';' || char === '|' || char === '&') {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function splitArgs(argumentString: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;

  for (let index = 0; index < argumentString.length; index += 1) {
    const char = argumentString[index];

    if (inQuote) {
      current += char;
      if (char === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inQuote = char;
      current += char;
      continue;
    }

    if (char === ' ' || char === '\t') {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

function extractMkdirPaths(segment: string): string[] | null {
  const trimmed = segment.trim();
  if (!trimmed) {
    return null;
  }

  if (POWERSHELL_MKDIR_SEGMENT_RE.test(trimmed)) {
    return extractPowerShellMkdirPaths(trimmed);
  }

  if (!MKDIR_SEGMENT_RE.test(trimmed)) {
    return null;
  }

  const argumentString = trimmed.replace(/^(?:mkdir|md)\s+/i, '');
  const paths: string[] = [];

  for (const token of splitArgs(argumentString)) {
    const lower = token.toLowerCase();
    if (MKDIR_FLAGS.has(lower) || lower.startsWith('-')) {
      continue;
    }

    const normalized = normalizeDirPath(token);
    if (normalized) {
      paths.push(normalized);
    }
  }

  return paths.length > 0 ? paths : null;
}

function extractPowerShellMkdirPaths(segment: string): string[] | null {
  if (!/-ItemType\s+Directory/i.test(segment)) {
    return null;
  }

  const pathMatch = /-Path\s+(.+)$/i.exec(segment);
  if (!pathMatch?.[1]) {
    return null;
  }

  const rawPaths = pathMatch[1]
    .split(',')
    .map((part) => normalizeDirPath(part))
    .filter(Boolean);

  return rawPaths.length > 0 ? rawPaths : null;
}

function expandMkdirSegment(segment: string): FileOperation[] | null {
  const paths = extractMkdirPaths(segment);
  if (!paths) {
    return null;
  }

  return paths.map((dirPath) => ({
    action: 'CREATE_FOLDER' as const,
    path: dirPath,
  }));
}

export function tryExpandMkdirCommand(command: string): FileOperation[] | null {
  const segments = splitCommandSegments(command);
  if (segments.length === 0) {
    return null;
  }

  const expanded: FileOperation[] = [];
  const remaining: string[] = [];

  for (const segment of segments) {
    const mkdirOps = expandMkdirSegment(segment);
    if (mkdirOps) {
      expanded.push(...mkdirOps);
      continue;
    }

    remaining.push(segment);
  }

  if (expanded.length === 0) {
    return null;
  }

  if (remaining.length > 0) {
    expanded.push({
      action: 'RUN_COMMAND',
      command: remaining.join(' && '),
    });
  }

  return expanded;
}

export function expandMkdirOperations(operations: FileOperation[]): FileOperation[] {
  const expanded: FileOperation[] = [];

  for (const operation of operations) {
    if (operation.action !== 'RUN_COMMAND' || !operation.command?.trim()) {
      expanded.push(operation);
      continue;
    }

    const mkdirExpanded = tryExpandMkdirCommand(operation.command.trim());
    if (mkdirExpanded) {
      expanded.push(...mkdirExpanded);
      continue;
    }

    expanded.push({
      ...operation,
      command: sanitizeRunCommand(operation.command),
    });
  }

  return dedupeCreateFolders(expanded);
}

function sanitizeRunCommand(command: string): string {
  if (process.platform !== 'win32') {
    return command;
  }

  return command.replace(/\\(?![\s"'&|;])/g, '/');
}

function dedupeCreateFolders(operations: FileOperation[]): FileOperation[] {
  const seen = new Set<string>();
  const result: FileOperation[] = [];

  for (const operation of operations) {
    if (operation.action !== 'CREATE_FOLDER' || !operation.path) {
      result.push(operation);
      continue;
    }

    const key = operation.path.replace(/\\/g, '/').toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(operation);
  }

  return result;
}

export function looksLikePowerShellCommand(command: string): boolean {
  return (
    /\bNew-Item\b/i.test(command) ||
    /\$env:/i.test(command) ||
    /\bGet-ChildItem\b/i.test(command) ||
    /\bSet-Location\b/i.test(command) ||
    (/\bmkdir\b/i.test(command) && /\s-Force\b/i.test(command))
  );
}
