import path from 'node:path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { collectProjectDirectories, scanDirectoryTree, type ContextDirectory } from './directory-tree.js';

export const CONTEXT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.openbrowser/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.turbo/**',
];

/** Binary assets are listed in folder trees but never embedded as text context. */
export const BINARY_CONTEXT_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
  '.heic',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.7z',
  '.rar',
  '.mp3',
  '.mp4',
  '.wav',
  '.mov',
  '.avi',
  '.exe',
  '.dll',
  '.bin',
  '.dat',
]);

export function isTextContextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext.length === 0 || !BINARY_CONTEXT_EXTENSIONS.has(ext);
}

const MAX_FILES = 30;
const MAX_FILE_BYTES = 32_000;
const MAX_TOTAL_BYTES = 120_000;

export interface ContextFile {
  path: string;
  language: string;
  content: string;
  truncated: boolean;
}

export interface ContextAttachment {
  files: ContextFile[];
  directories: ContextDirectory[];
}

export type { ContextDirectory } from './directory-tree.js';

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

  for (const dir of await collectProjectDirectories(projectRoot)) {
    dirs.add(dir);
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

export async function loadContextAttachments(
  projectRoot: string,
  refs: string[],
): Promise<ContextAttachment> {
  const files = await loadContextFiles(projectRoot, refs);
  const directories: ContextDirectory[] = [];
  const uniqueRefs = [...new Set(refs.map((ref) => ref.replace(/\\/g, '/').replace(/\/$/, '')))];

  for (const ref of uniqueRefs) {
    const resolved = path.resolve(projectRoot, ref);
    if (!(await fs.pathExists(resolved))) {
      continue;
    }

    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      continue;
    }

    const tree = await scanDirectoryTree(projectRoot, ref);
    if (tree) {
      directories.push(tree);
    }
  }

  return { files, directories };
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
        const relativePath = path.posix.join(relativeDir, nestedFile);
        if (isTextContextFile(relativePath)) {
          filePaths.add(relativePath);
        }
      }
      continue;
    }

    const relativePath = path.relative(projectRoot, resolved).replace(/\\/g, '/');
    if (isTextContextFile(relativePath)) {
      filePaths.add(relativePath);
    }
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

export function formatContextMarkdown(
  files: ContextFile[],
  directories: ContextDirectory[] = [],
): string {
  if (files.length === 0 && directories.length === 0) {
    return '';
  }

  const sections: string[] = [];

  for (const directory of directories) {
    sections.push(
      `### ${directory.relativePath}/`,
      '',
      '```text',
      directory.treeText,
      '```',
      '',
      directory.empty
        ? '*(empty directory — no files yet)*'
        : `*${directory.fileCount} file(s), ${directory.directories.length} subfolder(s). Binary images (png, jpg, etc.) appear in the tree only — not embedded.*`,
      '',
    );
  }

  for (const file of files) {
    const truncatedNote = file.truncated ? '\n\n*(truncated)*' : '';
    sections.push(
      `### ${file.path}`,
      '',
      '```' + file.language,
      file.content,
      '```',
      truncatedNote,
      '',
    );
  }

  return ['--- Context Files ---', '', ...sections, '--- End Context Files ---'].join('\n');
}

export function formatContextJson(
  files: ContextFile[],
  projectSummary?: string,
  directories: ContextDirectory[] = [],
): string {
  const payload = {
    projectSummary: projectSummary ?? null,
    contextDirectories: directories.map((directory) => ({
      path: directory.relativePath,
      empty: directory.empty,
      fileCount: directory.fileCount,
      directories: directory.directories,
      files: directory.files,
      treeText: directory.treeText,
    })),
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
  directories: ContextDirectory[] = [],
): string {
  const payload = {
    projectSummary: projectSummary ?? null,
    runtime: {
      platform: process.platform,
      shell: process.platform === 'win32' ? process.env.COMSPEC ?? 'cmd.exe' : '/bin/sh',
    },
    editingRules: [
      'Context files below include line numbers (format: "   1| code").',
      'contextDirectories lists attached folder trees, including empty folders with no files.',
      'Binary image/media files (png, jpg, gif, webp, etc.) may appear in folder trees but are not embedded in context.',
      'If contextDirectories.empty is true, the folder exists but has no files — use CREATE_FILE, not EDIT_FILE.',
      'For EDIT_FILE on an existing file: prefer startLine, endLine, and replace for partial edits.',
      'For code files (.js, .json, .yml, etc.): use ---OB_FILE_BEGIN: path--- ... ---OB_FILE_END--- blocks.',
      'For README.md and .md files: use ONE ```markdown ... ``` fenced block (ask mode = draft only, agent mode = create file).',
      'Do NOT create README.md or other .md files unless the user explicitly asks for them.',
      'For YAML (.yml/.yaml): use OB_FILE blocks with real line breaks — not ```yaml fences.',
      'For directories: use CREATE_FOLDER — NOT RUN_COMMAND mkdir/md/New-Item.',
      'Operation order: CREATE_FOLDER first, then CREATE_FILE/EDIT_FILE, then RUN_COMMAND last.',
      'pnpm-workspace.yaml must use list dashes: packages: then "  - \\"apps/*\\"" on each line.',
      'Create package.json files via CREATE_FILE before pnpm install — not pnpm init in shell.',
      'For RUN_COMMAND: put commands only in JSON { "action": "RUN_COMMAND", "command": "..." } — never only in ```bash blocks.',
      'On Windows (runtime.platform win32): use forward slashes in command paths; avoid bash-only mkdir syntax.',
      'Do not use EDIT_FILE on package.json after npm init — use CREATE_FILE with full package.json content instead.',
    ],
    contextDirectories: directories.map((directory) => ({
      path: directory.relativePath,
      empty: directory.empty,
      fileCount: directory.fileCount,
      directories: directory.directories,
      files: directory.files,
      treeText: directory.treeText,
    })),
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
