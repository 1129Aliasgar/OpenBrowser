const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ORANGE = '\x1b[38;5;208m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const CLEAR_LINE = '\r\x1b[K';

export const DIVIDER_WIDTH = 72;
export const DIVIDER = `${GRAY}${'─'.repeat(DIVIDER_WIDTH)}${RESET}`;
export const SESSION_DIVIDER = `${GRAY}${'═'.repeat(DIVIDER_WIDTH)}${RESET}`;

export const colors = {
  reset: RESET,
  bold: BOLD,
  dim: DIM,
  orange: ORANGE,
  green: GREEN,
  red: RED,
  yellow: YELLOW,
  blue: BLUE,
  magenta: MAGENTA,
  cyan: CYAN,
  gray: GRAY,
};

export function printBanner(): void {
  const line = `${GRAY}${'─'.repeat(DIVIDER_WIDTH)}${RESET}`;
  process.stdout.write(`\n${line}\n`);
  process.stdout.write(`${ORANGE}${BOLD}  openbrowser${RESET}\n`);
  process.stdout.write(`${DIM}  Browser AI → your local project${RESET}\n`);
  process.stdout.write(`${line}\n\n`);
}

export function printModeMenu(): void {
  process.stdout.write(`\n${DIVIDER}\n`);
  process.stdout.write(`${BOLD}Select mode${RESET}\n`);
  process.stdout.write(`  ${CYAN}1${RESET}. ${BLUE}ask${RESET} ${DIM}(chat / draft README & .md)${RESET}\n`);
  process.stdout.write(`  ${CYAN}2${RESET}. ${MAGENTA}agent${RESET} ${DIM}(create & edit project files)${RESET}\n`);
  process.stdout.write(`  ${CYAN}q${RESET}. exit\n`);
  process.stdout.write(`${DIVIDER}\n`);
}

export function formatModePrompt(mode: 'ask' | 'agent'): string {
  if (mode === 'ask') {
    return `${BLUE}${BOLD}ask${RESET}${GRAY}>${RESET} `;
  }
  return `${MAGENTA}${BOLD}agent${RESET}${GRAY}>${RESET} `;
}

export function formatModeChoicePrompt(): string {
  return `${ORANGE}mode${RESET}${GRAY}>${RESET} `;
}

export function writeAtHint(): void {
  process.stdout.write(
    `\n${DIM}Type ${CYAN}@${RESET}${DIM} for file suggestions (Tab to complete). Paste with Ctrl+V — press ${BOLD}Enter${RESET}${DIM} to send.${RESET}\n`,
  );
}

export function writeInfo(message: string): void {
  process.stdout.write(`${GRAY}[${RESET}${ORANGE}openbrowser${RESET}${GRAY}]${RESET} ${message}\n`);
}

export function writeSuccess(message: string): void {
  process.stdout.write(`${GREEN}✓${RESET} ${message}\n`);
}

export function writeWarning(message: string): void {
  process.stdout.write(`${YELLOW}⚠${RESET} ${message}\n`);
}

export function writeError(message: string): void {
  process.stdout.write(`${RED}✗${RESET} ${message}\n`);
}

export function writeSessionEnd(label = 'session complete'): void {
  process.stdout.write(`\n${SESSION_DIVIDER}\n`);
  process.stdout.write(`${DIM}  ${label}${RESET}\n`);
  process.stdout.write(`${SESSION_DIVIDER}\n\n`);
}

export function renderMarkdownForTerminal(markdown: string): string {
  let text = markdown.replace(/\r\n/g, '\n');

  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code: string) => {
    const lines = code
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => `${GRAY}  ${line}${RESET}`);
    return `\n${lines.join('\n')}\n`;
  });

  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_match, title: string) => `${BOLD}${title}${RESET}`);
  text = text.replace(/\*\*([^*]+)\*\*/g, `${BOLD}$1${RESET}`);
  text = text.replace(/`([^`]+)`/g, `${CYAN}$1${RESET}`);
  text = text.replace(/^[-*]\s+/gm, `  ${CYAN}•${RESET} `);

  return text;
}

export function writeAnswerBlock(answer: string): void {
  const rendered = renderMarkdownForTerminal(answer);
  process.stdout.write(`\n${DIVIDER}\n`);
  process.stdout.write(`${BOLD}${BLUE}Response${RESET}\n`);
  process.stdout.write(`${DIVIDER}\n`);
  process.stdout.write(`${rendered}\n`);
  process.stdout.write(`${DIVIDER}\n`);
}

export function renderDiffForTerminal(diff: string): string {
  const trimmed = diff.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('RUN_COMMAND')) {
    const command = trimmed.replace(/^RUN_COMMAND\s*/, '');
    return `${YELLOW}${BOLD}RUN_COMMAND${RESET} ${command}`;
  }

  if (trimmed.startsWith('CREATE_FOLDER')) {
    const path = trimmed.replace(/^CREATE_FOLDER\s*/, '');
    return `${CYAN}${BOLD}CREATE_FOLDER${RESET} ${path}`;
  }

  if (trimmed.startsWith('RENAME_FILE')) {
    return `${MAGENTA}${BOLD}${trimmed}${RESET}`;
  }

  if (!trimmed.includes('@@') && !trimmed.includes('---')) {
    return `${DIM}${trimmed}${RESET}`;
  }

  return trimmed
    .split('\n')
    .map((line) => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        return `${BLUE}${line}${RESET}`;
      }
      if (line.startsWith('@@')) {
        return `${CYAN}${line}${RESET}`;
      }
      if (line.startsWith('+')) {
        return `${GREEN}${line}${RESET}`;
      }
      if (line.startsWith('-')) {
        return `${RED}${line}${RESET}`;
      }
      if (line.startsWith('Index:') || line.startsWith('===')) {
        return `${GRAY}${line}${RESET}`;
      }
      return line;
    })
    .join('\n');
}

export function writeDiffBlock(diff: string): void {
  const rendered = renderDiffForTerminal(diff);
  if (!rendered) {
    return;
  }

  process.stdout.write(`\n${rendered}\n`);
}

export class WaitingSpinner {
  private spinnerTimer: ReturnType<typeof setInterval> | undefined;

  start(label = 'waiting for response'): void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frame = 0;
    process.stdout.write(`\n${GRAY}[${RESET}${ORANGE}openbrowser${RESET}${GRAY}]${RESET} ${label} ${frames[0]}`);

    this.spinnerTimer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      process.stdout.write(
        `${CLEAR_LINE}${GRAY}[${RESET}${ORANGE}openbrowser${RESET}${GRAY}]${RESET} ${label} ${CYAN}${frames[frame]}${RESET}`,
      );
    }, 80);
  }

  stop(): void {
    if (!this.spinnerTimer) {
      return;
    }

    clearInterval(this.spinnerTimer);
    this.spinnerTimer = undefined;
    process.stdout.write(CLEAR_LINE);
  }
}
