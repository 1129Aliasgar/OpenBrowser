import { stdin, stdout } from 'node:process';
import readline from 'node:readline';

const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CLEAR_EOL = '\x1b[K';

export interface AtCompletionResult {
  ghost: string;
  completion: string | null;
}

export function getAtCompletion(line: string, choices: string[]): AtCompletionResult {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(line);
  if (!match) {
    return { ghost: '', completion: null };
  }

  const partial = match[1] ?? '';
  const matches = choices
    .filter(
      (choice) =>
        partial === '' ||
        choice.toLowerCase().startsWith(partial.toLowerCase()) ||
        choice.toLowerCase().includes(partial.toLowerCase()),
    )
    .sort((left, right) => {
      const leftStarts = left.toLowerCase().startsWith(partial.toLowerCase()) ? 0 : 1;
      const rightStarts = right.toLowerCase().startsWith(partial.toLowerCase()) ? 0 : 1;
      return leftStarts - rightStarts || left.localeCompare(right);
    });

  if (matches.length === 0) {
    return { ghost: '', completion: null };
  }

  const best = matches[0];
  if (partial === best) {
    return { ghost: '', completion: best };
  }

  if (best.toLowerCase().startsWith(partial.toLowerCase())) {
    return { ghost: best.slice(partial.length), completion: best };
  }

  return { ghost: best.slice(partial.length), completion: best };
}

export async function readLineWithAtCompletion(
  prompt: string,
  choices: string[],
): Promise<string> {
  if (!stdin.isTTY) {
    return readLineFallback(prompt, choices);
  }

  stdout.write(prompt);
  let buffer = '';

  return new Promise((resolve) => {
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    const redraw = (): void => {
      const { ghost } = getAtCompletion(buffer, choices);
      stdout.write(`\r${CLEAR_EOL}${prompt}${buffer}${DIM}${ghost}${RESET}`);
    };

    const cleanup = (): void => {
      stdin.removeListener('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onKeypress = (str: string | undefined, key: readline.Key): void => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        stdout.write('\n');
        process.exit(130);
      }

      if (key.name === 'return') {
        cleanup();
        stdout.write('\n');
        resolve(buffer);
        return;
      }

      if (key.name === 'tab') {
        const { completion } = getAtCompletion(buffer, choices);
        if (completion) {
          const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(buffer);
          if (atMatch) {
            const partial = atMatch[1] ?? '';
            const atPos = buffer.lastIndexOf(`@${partial}`);
            buffer = `${buffer.slice(0, atPos)}@${completion}`;
            redraw();
          }
        }
        return;
      }

      if (key.name === 'backspace') {
        buffer = buffer.slice(0, -1);
        redraw();
        return;
      }

      if (str && !key.ctrl && !key.meta) {
        buffer += str;
        redraw();
      }
    };

    stdin.on('keypress', onKeypress);
  });
}

async function readLineFallback(prompt: string, choices: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
    completer: (line: string) => {
      const { completion } = getAtCompletion(line, choices);
      if (!completion) {
        return [[], line];
      }

      const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(line);
      const partial = atMatch?.[1] ?? '';
      const atPos = line.lastIndexOf(`@${partial}`);
      const completed = `${line.slice(0, atPos)}@${completion}`;
      return [[completed], line];
    },
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
