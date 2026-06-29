import { AutoComplete } from 'enquirer';
import { listContextChoices } from './file-context.js';

export function parseAtRefs(text: string): { cleanPrompt: string; paths: string[] } {
  const paths: string[] = [];

  const cleanPrompt = text
    .replace(/@([^\s@]+)/g, (_match, ref: string) => {
      paths.push(ref.replace(/\\/g, '/'));
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanPrompt, paths };
}

export async function pickContextPaths(projectRoot: string): Promise<string[]> {
  const choices = await listContextChoices(projectRoot);
  if (choices.length === 0) {
    return [];
  }

  const prompt = new AutoComplete({
    name: 'context',
    message: 'Attach file or folder (@)',
    limit: 12,
    multiple: true,
    choices: choices.map((choice) => ({
      name: choice.endsWith('/') ? `📁 ${choice}` : `📄 ${choice}`,
      value: choice,
    })),
  });

  const answer = await prompt.run();
  if (!answer) {
    return [];
  }

  return Array.isArray(answer) ? answer : [answer];
}
