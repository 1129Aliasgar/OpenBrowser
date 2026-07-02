import pino from 'pino';
import {
  colors,
  DIVIDER,
  formatModeChoicePrompt,
  formatModePrompt,
  printBanner,
  printModeMenu,
  SESSION_DIVIDER,
  writeAtHint,
  writeDiffBlock,
  writeError,
  writeInfo,
  writeSessionEnd,
  writeSuccess,
  writeWarning,
  WaitingSpinner,
  writeAnswerBlock,
  renderMarkdownForTerminal,
  renderDiffForTerminal,
} from './terminal.js';

export const logger = pino(
  {
    name: 'openbrowser',
    level: process.env.LOG_LEVEL ?? 'warn',
  },
  pino.destination(2),
);

export {
  colors,
  DIVIDER,
  formatModeChoicePrompt,
  formatModePrompt,
  printBanner,
  printModeMenu,
  renderDiffForTerminal,
  renderMarkdownForTerminal,
  SESSION_DIVIDER,
  WaitingSpinner,
  writeAnswerBlock,
  writeAtHint,
  writeDiffBlock,
  writeError,
  writeInfo,
  writeSessionEnd,
  writeSuccess,
  writeWarning,
};

export type TrackerStep =
  | 'reading browser'
  | 'loading'
  | 'reading project'
  | 'creating file'
  | 'editing file'
  | 'deleting file'
  | 'renaming file'
  | 'creating folder'
  | 'running command'
  | 'waiting'
  | 'complete';

const STEP_COLORS: Record<TrackerStep, string> = {
  'reading browser': colors.cyan,
  loading: colors.yellow,
  'reading project': colors.blue,
  'creating file': colors.green,
  'editing file': colors.yellow,
  'deleting file': colors.red,
  'renaming file': colors.magenta,
  'creating folder': colors.cyan,
  'running command': colors.orange,
  waiting: colors.gray,
  complete: colors.green,
};

export class AgentStepTracker {
  private lastStep: string | null = null;

  step(step: TrackerStep, detail?: string): void {
    this.lastStep = step;
    const color = STEP_COLORS[step] ?? colors.reset;
    const suffix = detail ? `${colors.dim} ${detail}${colors.reset}` : '';
    process.stdout.write(
      `\n${colors.gray}[${colors.reset}${colors.orange}openbrowser${colors.reset}${colors.gray}]${colors.reset} ${color}${step}${colors.reset}${suffix}\n`,
    );
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
