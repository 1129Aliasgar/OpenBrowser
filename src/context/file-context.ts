import path from 'node:path';
import fg from 'fast-glob';
import fs from 'fs-extra';

export const CONTEXT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.openbrowser/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.turbo/**',
];

const MAX_FILES = 30;
const MAX_FILE_BYTES = 32_000;
const MAX_TOTAL_BYTES = 120_000;

export interface ContextFile {
  path: string;
  language: string;
  content: string;
  truncated: boolean;
}

export async function listContextChoices(projectRoot: string): Promise<string[]> {
  const files = await fg('**/*', {
    cwd: projectRoot,
    dot: false,
    onlyFiles: true,
    ignore: CONTEXT_IGNORE,
  });

  const dirs = new Set<string>();
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(`${parts.slice(0, i).join('/')}/`);
    }
  }

  const topLevel = await fs.readdir(projectRoot);
  for (const entry of topLevel) {
    const fullPath = path.join(projectRoot, entry);
    if ((await fs.stat(fullPath)).isDirectory()) {
      dirs.add(`${entry}/`);
    }
  }

  return [...[...dirs].sort(), ...files.sort()];
}

export async function loadContextFiles(
  projectRoot: string,
  refs: string[],
): Promise<ContextFile[]> {
  const uniqueRefs = [...new Set(refs.map((ref) => ref.replace(/\\/g, '/').replace(/\/$/, '')))];
  const filePaths = new Set<string>();

  for (const ref of uniqueRefs) {
    const resolved = path.resolve(projectRoot, ref);
    if (!resolved.startsWith(path.resolve(projectRoot))) {
      continue;
    }

    if (!(await fs.pathExists(resolved))) {
      continue;
    }

    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      const nested = await fg('**/*', {
        cwd: resolved,
        dot: false,
        onlyFiles: true,
        ignore: CONTEXT_IGNORE,
      });
      const relativeDir = path.relative(projectRoot, resolved).replace(/\\/g, '/');
      for (const nestedFile of nested) {
        filePaths.add(path.posix.join(relativeDir, nestedFile));
      }
      continue;
    }

    filePaths.add(path.relative(projectRoot, resolved).replace(/\\/g, '/'));
  }

  const sortedPaths = [...filePaths].sort().slice(0, MAX_FILES);
  const loaded: ContextFile[] = [];
  let totalBytes = 0;

  for (const relativePath of sortedPaths) {
    if (totalBytes >= MAX_TOTAL_BYTES) {
      break;
    }

    const fullPath = path.join(projectRoot, relativePath);
    if (!(await fs.pathExists(fullPath))) {
      continue;
    }

    const buffer = await fs.readFile(fullPath);
    const remaining = MAX_TOTAL_BYTES - totalBytes;
    const maxForFile = Math.min(MAX_FILE_BYTES, remaining);
    const truncated = buffer.byteLength > maxForFile;
    const content = buffer.subarray(0, maxForFile).toString('utf8');

    loaded.push({
      path: relativePath.replace(/\\/g, '/'),
      language: detectLanguage(relativePath),
      content,
      truncated,
    });
    totalBytes += Buffer.byteLength(content, 'utf8');
  }

  return loaded;
}

export function formatContextMarkdown(files: ContextFile[]): string {
  if (files.length === 0) {
    return '';
  }

  const sections = files.map((file) => {
    const truncatedNote = file.truncated ? '\n\n*(truncated)*' : '';
    return [
      `### ${file.path}`,
      '',
      '```' + file.language,
      file.content,
      '```',
      truncatedNote,
    ].join('\n');
  });

  return ['--- Context Files ---', '', ...sections, '', '--- End Context Files ---'].join('\n');
}

export function formatContextJson(
  files: ContextFile[],
  projectSummary?: string,
): string {
  const payload = {
    projectSummary: projectSummary ?? null,
    contextFiles: files.map((file) => ({
      path: file.path,
      language: file.language,
      truncated: file.truncated,
      content: file.content,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

export function formatAgentContextJson(
  files: ContextFile[],
  projectSummary?: string,
): string {
  const payload = {
    projectSummary: projectSummary ?? null,
    editingRules: [
      'Context files below include line numbers (format: "   1| code").',
      'For EDIT_FILE on an existing file: prefer startLine, endLine, and replace for partial edits.',
      'For code files (.js, .json, etc.): use ---OB_FILE_BEGIN: path--- ... ---OB_FILE_END--- blocks.',
      'For README.md and .md files: use ONE ```markdown ... ``` fenced block (ask mode = draft only, agent mode = create file).',
      'Do not use EDIT_FILE on package.json after npm init — use CREATE_FILE with full package.json content instead.',
    ],
    contextFiles: files.map((file) => ({
      path: file.path,
      language: file.language,
      truncated: file.truncated,
      exists: true,
      numberedContent: addLineNumbers(file.content),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function addLineNumbers(content: string): string {
  return content
    .split('\n')
    .map((line, index) => `${String(index + 1).padStart(4, ' ')}| ${line}`)
    .join('\n');
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.html': 'html',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sh': 'bash',
    '.py': 'python',
  };

  return map[ext] ?? (ext.replace('.', '') ?? 'text');
}
