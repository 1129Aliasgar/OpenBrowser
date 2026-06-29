const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';

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
  process.stdout.write(`\n${'─'.repeat(60)}\n${rendered}\n${'─'.repeat(60)}\n`);
}
