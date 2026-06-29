const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const CLEAR_LINE = '\r\x1b[K';

const SEPARATOR = '─'.repeat(60);

export function renderMarkdownForTerminal(markdown: string): string {
  let text = markdown.replace(/\r\n/g, '\n');

  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code: string) => {
    const lines = code.replace(/\n$/, '').split('\n').map((line) => `${DIM}  ${line}${RESET}`);
    return `\n${lines.join('\n')}\n`;
  });

  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_match, title: string) => `${BOLD}${title}${RESET}`);
  text = text.replace(/\*\*([^*]+)\*\*/g, `${BOLD}$1${RESET}`);
  text = text.replace(/`([^`]+)`/g, `${CYAN}$1${RESET}`);
  text = text.replace(/^[-*]\s+/gm, '  • ');

  return text;
}

export function writeAnswerBlock(answer: string): void {
  const rendered = renderMarkdownForTerminal(answer);
  process.stdout.write(`\n${SEPARATOR}\n${rendered}\n${SEPARATOR}\n`);
}

export class AnswerStream {
  private spinnerTimer: ReturnType<typeof setInterval> | undefined;
  private streamed = false;
  private writtenLength = 0;

  startWaiting(): void {
    const frames = ['|', '/', '-', '\\'];
    let frame = 0;
    process.stdout.write(`\n[openbrowser] waiting for response ${frames[0]}`);

    this.spinnerTimer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      process.stdout.write(`${CLEAR_LINE}[openbrowser] waiting for response ${frames[frame]}`);
    }, 120);
  }

  onChunk(text: string): void {
    this.stopSpinner();

    if (!this.streamed) {
      this.streamed = true;
      process.stdout.write(`\n${SEPARATOR}\n`);
    }

    if (text.length > this.writtenLength) {
      process.stdout.write(text.slice(this.writtenLength));
      this.writtenLength = text.length;
    }
  }

  finish(text: string): void {
    this.stopSpinner();

    if (this.streamed) {
      this.onChunk(text);
      process.stdout.write(`\n${SEPARATOR}\n`);
      return;
    }

    writeAnswerBlock(text);
  }

  private stopSpinner(): void {
    if (!this.spinnerTimer) {
      return;
    }

    clearInterval(this.spinnerTimer);
    this.spinnerTimer = undefined;
    process.stdout.write(CLEAR_LINE);
  }
}
