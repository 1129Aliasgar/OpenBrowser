import path from 'node:path';
import { createPatch } from 'diff';
import fs from 'fs-extra';
import type { FileOperation } from '../core/index.js';
import { appendHistory } from '../memory/index.js';

export interface PlannedOperation {
  operation: FileOperation;
  absolutePath: string;
  diff: string;
}

export interface ExecuteOptions {
  dryRun?: boolean;
  conversationId?: string;
  onStep?: (step: string, detail?: string) => void;
}

export async function planOperations(
  operations: FileOperation[],
  projectRoot: string,
): Promise<PlannedOperation[]> {
  const root = path.resolve(projectRoot);
  const plans: PlannedOperation[] = [];

  for (const operation of operations) {
    const absolutePath = resolveInsideRoot(root, operation.path);
    plans.push({
      operation,
      absolutePath,
      diff: await buildDiff(operation, absolutePath, root),
    });
  }

  return plans;
}

export async function executeOperations(
  operations: FileOperation[],
  projectRoot: string,
  options: ExecuteOptions = {},
): Promise<PlannedOperation[]> {
  const plans = await planOperations(operations, projectRoot);

  if (options.dryRun) {
    return plans;
  }

  for (const plan of plans) {
    await applyOperation(plan, projectRoot, options.onStep);
  }

  await appendHistory(projectRoot, {
    timestamp: new Date().toISOString(),
    conversationId: options.conversationId,
    mode: 'agent',
    summary: `Applied ${plans.length} operation(s)`,
  });

  return plans;
}

function resolveInsideRoot(projectRoot: string, relativePath: string): string {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const relative = path.relative(projectRoot, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }

  return absolutePath;
}

async function buildDiff(
  operation: FileOperation,
  absolutePath: string,
  projectRoot: string,
): Promise<string> {
  const relativePath = path.relative(projectRoot, absolutePath);

  if (operation.action === 'CREATE_FOLDER') {
    return `CREATE_FOLDER ${relativePath}`;
  }

  if (operation.action === 'RENAME_FILE') {
    if (!operation.replace) {
      throw new Error('RENAME_FILE requires replace as destination path');
    }
    resolveInsideRoot(projectRoot, operation.replace);
    return `RENAME_FILE ${relativePath} -> ${operation.replace}`;
  }

  const before = (await fs.pathExists(absolutePath))
    ? await fs.readFile(absolutePath, 'utf8')
    : '';

  if (operation.action === 'DELETE_FILE') {
    return createPatch(relativePath, before, '', 'before', 'after');
  }

  const after = nextContent(operation, before);
  return createPatch(relativePath, before, after, 'before', 'after');
}

async function applyOperation(
  plan: PlannedOperation,
  projectRoot: string,
  onStep?: (step: string, detail?: string) => void,
): Promise<void> {
  const { operation, absolutePath } = plan;
  const relativePath = path.relative(projectRoot, absolutePath);

  switch (operation.action) {
    case 'CREATE_FOLDER':
      onStep?.('creating folder', relativePath);
      await fs.ensureDir(absolutePath);
      break;
    case 'CREATE_FILE':
      onStep?.('creating file', relativePath);
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, operation.content ?? '');
      break;
    case 'EDIT_FILE': {
      onStep?.('editing file', relativePath);
      const before = (await fs.pathExists(absolutePath))
        ? await fs.readFile(absolutePath, 'utf8')
        : '';
      await fs.writeFile(absolutePath, nextContent(operation, before));
      break;
    }
    case 'DELETE_FILE':
      onStep?.('deleting file', relativePath);
      await fs.remove(absolutePath);
      break;
    case 'RENAME_FILE': {
      onStep?.('renaming file', relativePath);
      if (!operation.replace) {
        throw new Error('RENAME_FILE requires replace as destination path');
      }
      const destination = resolveInsideRoot(projectRoot, operation.replace);
      await fs.ensureDir(path.dirname(destination));
      await fs.move(absolutePath, destination, { overwrite: false });
      break;
    }
    default:
      assertNever(operation.action);
  }
}

function nextContent(operation: FileOperation, before: string): string {
  if (operation.search !== undefined && operation.replace !== undefined) {
    if (!before.includes(operation.search)) {
      throw new Error(`Search text not found in ${operation.path}`);
    }
    return before.replace(operation.search, operation.replace);
  }

  if (operation.content !== undefined) {
    return operation.content;
  }

  throw new Error(`${operation.action} requires content or search/replace`);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported operation: ${value}`);
}
