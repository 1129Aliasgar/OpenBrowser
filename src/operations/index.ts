import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { createPatch } from 'diff';
import fs from 'fs-extra';
import type { FileOperation } from '../core/index.js';
import { normalizeMultilineText } from '../parser/markdown-agent.js';
import { appendHistory } from '../memory/index.js';

const execAsync = promisify(exec);

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
    if (operation.action === 'RUN_COMMAND') {
      plans.push({
        operation,
        absolutePath: root,
        diff: `RUN_COMMAND ${operation.command ?? ''}`,
      });
      continue;
    }

    if (!operation.path) {
      throw new Error(`${operation.action} requires path`);
    }

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

  switch (operation.action) {
    case 'RUN_COMMAND': {
      const cwd = operation.path
        ? resolveInsideRoot(projectRoot, operation.path)
        : projectRoot;
      onStep?.('running command', operation.command);
      await runShellCommand(operation.command ?? '', cwd);
      break;
    }
    case 'CREATE_FOLDER': {
      const relativePath = path.relative(projectRoot, absolutePath);
      onStep?.('creating folder', relativePath);
      await fs.ensureDir(absolutePath);
      break;
    }
    case 'CREATE_FILE': {
      const relativePath = path.relative(projectRoot, absolutePath);
      onStep?.('creating file', relativePath);
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, operation.content ?? '');
      break;
    }
    case 'EDIT_FILE': {
      const relativePath = path.relative(projectRoot, absolutePath);
      const exists = await fs.pathExists(absolutePath);
      if (!exists) {
        if (!operation.content?.trim()) {
          throw new Error(
            `EDIT_FILE on missing file ${relativePath} requires full content (file will be created)`,
          );
        }
        onStep?.('creating file', `${relativePath} (via EDIT_FILE)`);
        await fs.ensureDir(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, operation.content ?? '');
        break;
      }

      onStep?.('editing file', relativePath);
      const before = await fs.readFile(absolutePath, 'utf8');
      await fs.writeFile(absolutePath, nextContent(operation, before));
      break;
    }
    case 'DELETE_FILE': {
      const relativePath = path.relative(projectRoot, absolutePath);
      onStep?.('deleting file', relativePath);
      await fs.remove(absolutePath);
      break;
    }
    case 'RENAME_FILE': {
      const relativePath = path.relative(projectRoot, absolutePath);
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

async function runShellCommand(command: string, cwd: string): Promise<void> {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error('RUN_COMMAND is empty');
  }

  try {
    const { stdout, stderr } = await execAsync(trimmed, {
      cwd,
      shell: process.platform === 'win32' ? process.env.COMSPEC ?? 'cmd.exe' : '/bin/sh',
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });

    if (stdout.trim()) {
      process.stdout.write(`${stdout.trim()}\n`);
    }
    if (stderr.trim()) {
      process.stderr.write(`${stderr.trim()}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Command failed: ${message}`);
  }
}

function nextContent(operation: FileOperation, before: string): string {
  if (
    operation.startLine !== undefined &&
    operation.endLine !== undefined &&
    operation.replace !== undefined
  ) {
    return applyLineEdit(
      before,
      operation.startLine,
      operation.endLine,
      normalizeMultilineText(operation.replace),
    );
  }

  if (operation.search !== undefined && operation.replace !== undefined) {
    const search = normalizeMultilineText(operation.search);
    const replace = normalizeMultilineText(operation.replace);
    if (!before.includes(search)) {
      throw new Error(`Search text not found in ${operation.path}`);
    }
    return before.replace(search, replace);
  }

  if (operation.content !== undefined) {
    return normalizeMultilineText(operation.content);
  }

  throw new Error(`${operation.action} requires content, line edit, or search/replace`);
}

function applyLineEdit(
  before: string,
  startLine: number,
  endLine: number,
  replacement: string,
): string {
  if (startLine < 1 || endLine < startLine) {
    throw new Error(`Invalid line range ${startLine}-${endLine} for edit`);
  }

  const lines = before.split('\n');
  if (startLine > lines.length + 1) {
    throw new Error(`startLine ${startLine} is beyond end of file (${lines.length} lines)`);
  }

  const startIndex = startLine - 1;
  const endIndex = Math.min(endLine, lines.length);
  const replacementLines = replacement.split('\n');

  return [
    ...lines.slice(0, startIndex),
    ...replacementLines,
    ...lines.slice(endIndex),
  ].join('\n');
}

function assertNever(value: never): never {
  throw new Error(`Unsupported operation: ${value}`);
}
