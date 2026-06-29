import { z } from 'zod';

const operationActions = [
  'CREATE_FILE',
  'EDIT_FILE',
  'DELETE_FILE',
  'RENAME_FILE',
  'CREATE_FOLDER',
] as const;

const relativePathSchema = z
  .string()
  .min(1)
  .transform((value) => value.replace(/\\/g, '/').replace(/^\.\//, ''))
  .refine((value) => !value.startsWith('/'), 'Path must be relative')
  .refine((value) => !/^[a-zA-Z]:\//.test(value), 'Path must not be absolute')
  .refine(
    (value) => !value.split('/').includes('..'),
    'Path must not escape the project root',
  );

export const operationSchema = z.object({
  action: z.enum(operationActions),
  path: relativePathSchema,
  content: z.string().optional(),
  search: z.string().optional(),
  replace: z.string().optional(),
}).superRefine((operation, ctx) => {
  if (operation.action === 'CREATE_FILE' && operation.content === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CREATE_FILE requires content',
      path: ['content'],
    });
  }

  if (
    operation.action === 'EDIT_FILE' &&
    operation.content === undefined &&
    (operation.search === undefined || operation.replace === undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'EDIT_FILE requires content or search and replace',
      path: ['content'],
    });
  }

  if (operation.action === 'RENAME_FILE') {
    const destination = operation.replace;
    if (!destination) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RENAME_FILE requires replace as the destination path',
        path: ['replace'],
      });
      return;
    }

    const normalized = destination.replace(/\\/g, '/').replace(/^\.\//, '');
    if (
      normalized.startsWith('/') ||
      /^[a-zA-Z]:\//.test(normalized) ||
      normalized.split('/').includes('..')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RENAME_FILE destination must stay inside the project root',
        path: ['replace'],
      });
    }
  }
});

export const aiResponseSchema = z
  .object({
    operations: z.array(operationSchema).optional(),
    conversationId: z.string().uuid(),
    error: z.string().nullable().optional(),
  })
  .superRefine((payload, ctx) => {
    if (!payload.error && !payload.operations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'operations is required when error is not set',
        path: ['operations'],
      });
    }
  });

export type Operation = z.infer<typeof operationSchema>;
export type AIResponsePayload = z.infer<typeof aiResponseSchema>;

export function validateAIResponse(payload: unknown): AIResponsePayload {
  return aiResponseSchema.parse(payload);
}

export function validateOperations(payload: unknown): Operation[] {
  return z.array(operationSchema).parse(payload);
}
