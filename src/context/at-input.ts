import { stdin, stdout } from 'node:process';
import readline from 'node:readline';

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
