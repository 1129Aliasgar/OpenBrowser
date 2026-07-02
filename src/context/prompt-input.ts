import { stdin, stdout } from 'node:process';
import readline from 'node:readline';
import { getAtCompletion } from '../context/at-input.js';

const BRACKETED_PASTE_START = '\x1b[200~';
const BRACKETED_PASTE_END = '\x1b[201~';
const ERASE_PREV_CHAR = '\b \b';

export interface ReadBufferedPromptOptions {
  choices?: string[];
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function countDisplayLines(prompt: string, buffer: string): number {
  const cols = stdout.columns || 80;
  if (cols <= 0) {
    return 1;
  }

  const totalChars = stripAnsi(prompt).length + buffer.length;
  return Math.max(1, Math.ceil(totalChars / cols));
}

/** Read one line; paste does not submit until Enter is pressed. */
export async function readBufferedPrompt(
  prompt: string,
  options: ReadBufferedPromptOptions = {},
): Promise<string> {
  if (!stdin.isTTY) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const answer = await new Promise<string>((resolve) => {
        rl.question(prompt, resolve);
      });
      return answer.trim();
    } finally {
      rl.close();
    }
  }

  return new Promise((resolve) => {
    let buffer = '';
    let bracketedPaste = '';
    let inBracketedPaste = false;
    let renderedLineCount = 1;
    const wasRaw = stdin.isRaw ?? false;

    readline.emitKeypressEvents(stdin);

    const refreshLineCount = (): void => {
      renderedLineCount = countDisplayLines(prompt, buffer);
    };

    const clearRenderedLines = (): void => {
      stdout.write('\r\x1b[K');
      for (let line = 1; line < renderedLineCount; line++) {
        stdout.write('\x1b[1A\r\x1b[K');
      }
    };

    const redraw = (): void => {
      clearRenderedLines();
      stdout.write(`${prompt}${buffer}`);
      refreshLineCount();
    };

    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
    };

    const submit = (): void => {
      cleanup();
      stdout.write('\n');
      resolve(buffer.trim());
    };

    const insertText = (text: string): void => {
      if (!text) {
        return;
      }

      const sanitized = text
        .replace(/\x00/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, ' ');

      if (!sanitized) {
        return;
      }

      buffer += sanitized;
      stdout.write(sanitized);
      refreshLineCount();
    };

    const backspace = (): void => {
      if (buffer.length === 0) {
        return;
      }

      buffer = buffer.slice(0, -1);

      if (renderedLineCount > 1) {
        redraw();
        return;
      }

      stdout.write(ERASE_PREV_CHAR);
      refreshLineCount();
    };

    const deletePreviousWord = (): void => {
      if (buffer.length === 0) {
        return;
      }

      const next = buffer.replace(/\s*\S+$/, '');
      if (next === buffer) {
        return;
      }

      buffer = next;
      redraw();
    };

    const applyTabCompletion = (): void => {
      if (!options.choices || options.choices.length === 0) {
        return;
      }

      const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(buffer);
      if (!atMatch) {
        return;
      }

      const partial = atMatch[1] ?? '';
      const { completion } = getAtCompletion(buffer, options.choices);
      if (!completion || completion === partial) {
        return;
      }

      const suffix = completion.slice(partial.length);
      if (!suffix) {
        return;
      }

      const atPos = buffer.lastIndexOf(`@${partial}`);
      buffer = `${buffer.slice(0, atPos)}@${completion}`;
      stdout.write(suffix);
      refreshLineCount();
    };

    const onData = (chunk: Buffer): void => {
      let text = chunk.toString('utf8');

      while (text.length > 0) {
        if (inBracketedPaste) {
          const endIndex = text.indexOf(BRACKETED_PASTE_END);
          if (endIndex === -1) {
            bracketedPaste += text;
            text = '';
            continue;
          }

          bracketedPaste += text.slice(0, endIndex);
          insertText(bracketedPaste);
          bracketedPaste = '';
          inBracketedPaste = false;
          text = text.slice(endIndex + BRACKETED_PASTE_END.length);
          continue;
        }

        const startIndex = text.indexOf(BRACKETED_PASTE_START);
        if (startIndex !== -1) {
          insertText(text.slice(0, startIndex));
          text = text.slice(startIndex + BRACKETED_PASTE_START.length);
          inBracketedPaste = true;
          continue;
        }

        if (text.startsWith('\x1b')) {
          text = '';
          continue;
        }

        if (text.length > 1) {
          insertText(text);
          text = '';
          continue;
        }

        const char = text[0] ?? '';
        text = text.slice(1);

        if (char === '\u0003') {
          cleanup();
          stdout.write('\n');
          process.exit(130);
        }

        if (char === '\t') {
          applyTabCompletion();
          continue;
        }

        if (char === '\u007f' || char === '\b') {
          backspace();
          continue;
        }

        if (char === '\u0017') {
          deletePreviousWord();
          continue;
        }

        if (char === '\r' || char === '\n') {
          submit();
          return;
        }

        insertText(char);
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
    stdout.write(prompt);
    refreshLineCount();
  });
}
