import { describe, expect, it } from 'vitest';
import { validateAIResponse, validateOperations } from './index.js';

describe('protocol validation', () => {
  it('accepts a valid create-file response', () => {
    const payload = validateAIResponse({
      conversationId: '7dbb8a0d-a439-4ef7-8e74-dbc560fe675e',
      operations: [
        {
          action: 'CREATE_FILE',
          path: './src/example.ts',
          content: 'export const value = 1;\n',
        },
      ],
    });

    expect(payload.operations?.[0]?.path).toBe('src/example.ts');
  });

  it('rejects paths that escape the project root', () => {
    expect(() =>
      validateOperations([
        {
          action: 'CREATE_FILE',
          path: '../outside.ts',
          content: '',
        },
      ]),
    ).toThrow(/escape the project root/i);
  });

  it('rejects edit operations without content or search and replace', () => {
    expect(() =>
      validateOperations([
        {
          action: 'EDIT_FILE',
          path: 'src/index.ts',
          replace: 'new content',
        },
      ]),
    ).toThrow(/requires content or search and replace/i);
  });

  it('rejects unsafe rename destinations', () => {
    expect(() =>
      validateOperations([
        {
          action: 'RENAME_FILE',
          path: 'src/index.ts',
          replace: '../index.ts',
        },
      ]),
    ).toThrow(/destination must stay inside/i);
  });
});
