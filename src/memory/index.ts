import path from 'node:path';
import fs from 'fs-extra';

export const OPENBROWSER_DIR = '.openbrowser';

export const MEMORY_FILES = {
  project: 'project.json',
  history: 'history.json',
  settings: 'settings.json',
  chat: 'chat.json',
  tasks: 'tasks.json',
  contextSummary: 'context-summary.md',
  promptsDir: 'prompts',
} as const;

export interface HistoryEntry {
  timestamp: string;
  conversationId?: string;
  mode: 'ask' | 'agent' | 'server';
  summary: string;
}

function memoryPath(projectRoot: string, fileName?: string): string {
  return path.join(projectRoot, OPENBROWSER_DIR, fileName ?? '');
}

export async function ensureMemory(projectRoot: string): Promise<void> {
  await fs.ensureDir(memoryPath(projectRoot));
  await Promise.all([
    ensureJson(projectRoot, MEMORY_FILES.project, {}),
    ensureJson(projectRoot, MEMORY_FILES.history, []),
    ensureJson(projectRoot, MEMORY_FILES.settings, { port: 5000 }),
    ensureJson(projectRoot, MEMORY_FILES.chat, []),
    ensureJson(projectRoot, MEMORY_FILES.tasks, []),
  ]);
}

export async function appendHistory(
  projectRoot: string,
  entry: HistoryEntry,
): Promise<void> {
  await ensureMemory(projectRoot);
  const historyFile = memoryPath(projectRoot, MEMORY_FILES.history);
  const history = (await fs.readJson(historyFile)) as HistoryEntry[];
  history.push(entry);
  await fs.writeJson(historyFile, history, { spaces: 2 });
}

export async function saveContextSummary(
  projectRoot: string,
  summary: string,
): Promise<void> {
  await ensureMemory(projectRoot);
  await fs.writeFile(memoryPath(projectRoot, MEMORY_FILES.contextSummary), summary);
}

async function ensureJson(
  projectRoot: string,
  fileName: string,
  value: unknown,
): Promise<void> {
  const filePath = memoryPath(projectRoot, fileName);
  if (!(await fs.pathExists(filePath))) {
    await fs.writeJson(filePath, value, { spaces: 2 });
  }
}

export function promptFilePath(projectRoot: string, sessionId: string): string {
  return path.join(
    memoryPath(projectRoot, MEMORY_FILES.promptsDir),
    `${sessionId}.txt`,
  );
}

export async function writePromptFile(
  projectRoot: string,
  sessionId: string,
  content: string,
): Promise<string> {
  const filePath = promptFilePath(projectRoot, sessionId);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function readPromptFile(
  projectRoot: string,
  sessionId: string,
): Promise<string> {
  return fs.readFile(promptFilePath(projectRoot, sessionId), 'utf8');
}
