import path from 'node:path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { CONTEXT_IGNORE } from './file-context.js';

const MAX_TREE_DEPTH = 10;
const MAX_TREE_ENTRIES = 200;

export interface ContextDirectory {
  path: string;
  relativePath: string;
  directories: string[];
  files: string[];
  fileCount: number;
  empty: boolean;
  treeText: string;
}

function shouldSkipDir(name: string): boolean {
  return CONTEXT_IGNORE.some((pattern) => {
    const stripped = pattern.replace(/\*\*/g, '').replace(/\//g, '').replace(/\*/g, '');
    return name === stripped || name.startsWith('.');
  });
}

export async function scanDirectoryTree(
  projectRoot: string,
  dirRef: string,
): Promise<ContextDirectory | null> {
  const normalizedRef = dirRef.replace(/\\/g, '/').replace(/\/$/, '');
  const resolved = path.resolve(projectRoot, normalizedRef);
  const rootResolved = path.resolve(projectRoot);

  if (!resolved.startsWith(rootResolved)) {
    return null;
  }

  if (!(await fs.pathExists(resolved))) {
    return null;
  }

  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    return null;
  }

  const relativePath = path.relative(projectRoot, resolved).replace(/\\/g, '/');
  const treeLines: string[] = [];
  const directories: string[] = [];
  const files: string[] = [];

  await walkDirectory(resolved, relativePath, 0, treeLines, directories, files);

  const nestedFiles = await fg('**/*', {
    cwd: resolved,
    dot: false,
    onlyFiles: true,
    ignore: CONTEXT_IGNORE,
  });

  for (const nestedFile of nestedFiles) {
    const filePath = path.posix.join(relativePath, nestedFile.replace(/\\/g, '/'));
    if (!files.includes(filePath)) {
      files.push(filePath);
    }
  }

  const fileCount = files.length;
  const treeText =
    treeLines.length > 0
      ? treeLines.join('\n')
      : `${relativePath}/ (empty — no files or subfolders)`;

  return {
    path: normalizedRef,
    relativePath,
    directories: [...new Set(directories)].sort(),
    files: [...new Set(files)].sort(),
    fileCount,
    empty: fileCount === 0 && directories.length === 0,
    treeText,
  };
}

async function walkDirectory(
  absoluteDir: string,
  relativeDir: string,
  depth: number,
  treeLines: string[],
  directories: string[],
  files: string[],
): Promise<void> {
  if (depth > MAX_TREE_DEPTH || treeLines.length >= MAX_TREE_ENTRIES) {
    return;
  }

  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  entries.sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  for (const entry of entries) {
    if (treeLines.length >= MAX_TREE_ENTRIES) {
      break;
    }

    if (entry.isDirectory() && shouldSkipDir(entry.name)) {
      continue;
    }

    const indent = '  '.repeat(depth);
    const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const dirPath = `${childRelative}/`;
      directories.push(dirPath);
      treeLines.push(`${indent}${entry.name}/`);

      await walkDirectory(
        path.join(absoluteDir, entry.name),
        childRelative,
        depth + 1,
        treeLines,
        directories,
        files,
      );
      continue;
    }

    if (entry.isFile()) {
      files.push(childRelative);
      treeLines.push(`${indent}${entry.name}`);
    }
  }
}

export async function collectProjectDirectories(projectRoot: string): Promise<string[]> {
  const dirs = new Set<string>();

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir = relativeDir ? path.join(projectRoot, relativeDir) : projectRoot;
    if (!(await fs.pathExists(absoluteDir))) {
      return;
    }

    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDir(entry.name)) {
        continue;
      }

      const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const normalized = `${childRelative.replace(/\\/g, '/')}/`;
      dirs.add(normalized);
      await walk(childRelative);
    }
  }

  await walk('');
  return [...dirs].sort();
}
