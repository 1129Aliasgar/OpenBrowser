export const PROMPT_INJECTION_CHAR_LIMIT = Number(
  process.env.PROMPT_INJECTION_CHAR_LIMIT ?? 12_000,
);

export const PROMPT_FILE_NAME = 'openbrowser-prompt.txt';

export const PROMPT_FILE_COMPOSER_NOTE =
  'The full OpenBrowser prompt is attached as openbrowser-prompt.txt. Read the attached file and follow every instruction inside it.';

export type PromptDelivery = 'text' | 'file';

export function shouldDeliverPromptAsFile(message: string): boolean {
  return message.length > PROMPT_INJECTION_CHAR_LIMIT;
}
