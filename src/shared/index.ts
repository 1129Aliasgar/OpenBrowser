import pino from 'pino';

export const logger = pino(
  {
    name: 'openbrowser',
    level: process.env.LOG_LEVEL ?? 'warn',
  },
  pino.destination(2),
);

export { AnswerStream, renderMarkdownForTerminal, writeAnswerBlock } from './terminal.js';

export type TrackerStep =
  | 'reading browser'
  | 'loading'
  | 'reading project'
  | 'creating file'
  | 'editing file'
  | 'deleting file'
  | 'renaming file'
  | 'creating folder'
  | 'waiting'
  | 'complete';

export class AgentStepTracker {
  private lastStep: string | null = null;

  step(step: TrackerStep, detail?: string): void {
    this.lastStep = step;
    const suffix = detail ? `: ${detail}` : '';
    process.stdout.write(`\n[openbrowser] ${step}${suffix}\n`);
  }

  complete(detail = 'done'): void {
    this.step('complete', detail);
  }

  current(): string | null {
    return this.lastStep;
  }
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
