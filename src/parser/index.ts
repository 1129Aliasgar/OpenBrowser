import { parse as parseJsonc } from 'jsonc-parser';
import { validateAIResponse, formatValidationError, type AIResponsePayload, type Operation } from '../protocol/index.js';
import {
  detectCopyPasteBlocks,
  extractFileBlocks,
  mergeFileBlocksIntoOperations,
  normalizeOperationTextFields,
  validateMergedFileOperations,
} from './markdown-agent.js';
import { FileOperation } from '../core/types/index.js';

export interface ParseAIResponseOptions {
  conversationId?: string;
}

export function parseAIResponse(
  raw: string,
  options: ParseAIResponseOptions = {},
): AIResponsePayload {
  const extracted = extractJsonFromText(raw);
  const parsed = parseAgentJson(extracted);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Response is not a JSON object');
  }

  const payload = { ...(parsed as Record<string, unknown>) };
  if (options.conversationId) {
    payload.conversationId = options.conversationId;
  }

  let validated: AIResponsePayload;
  try {
    validated = validateAIResponse(payload);
  } catch (error) {
    throw new Error(formatValidationError(error));
  }

  const copyPasteError = detectCopyPasteBlocks(raw);
  if (copyPasteError) {
    throw new Error(copyPasteError);
  }

  const fileBlocks = extractFileBlocks(raw);
  const mergedOps = normalizeOperationTextFields(
    mergeFileBlocksIntoOperations(
      (validated.operations ?? []) as unknown as FileOperation[],
      fileBlocks,
      raw,
    ),
  );
  validateMergedFileOperations(mergedOps);

  return {
    ...validated,
    operations: mergedOps as Operation[],
  };
}

function parseAgentJson(extracted: string): unknown {
  const candidates = buildJsonCandidates(extracted);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const parsed = parseJsonc(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Invalid JSON: ${lastError.message}`
      : 'Invalid JSON in agent response',
  );
}

function buildJsonCandidates(extracted: string): string[] {
  const unique = new Set<string>([
    extracted,
    extracted.replace(/""/g, '\\"'),
    extracted.replace(/:\s*""/g, ':"\\"').replace(/""(?=[,}\]])/g, '\\"'),
    extracted.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n'),
  ]);

  return [...unique];
}

function extractJsonFromText(raw: string): string {
  const trimmed = stripJsonFence(raw).trim();
  const candidates = findAllJsonObjects(trimmed);

  let best: string | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = scoreOperationsJson(candidate, trimmed);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best) {
    return best;
  }

  const start = trimmed.indexOf('{');
  if (start === -1) {
    return trimmed;
  }

  const balanced = extractBalancedJson(trimmed, start);
  return balanced ?? trimmed.slice(start);
}

function findAllJsonObjects(text: string): string[] {
  const objects: string[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '{') {
      continue;
    }

    const json = extractBalancedJson(text, index);
    if (!json) {
      continue;
    }

    objects.push(json);
    index += json.length - 1;
  }

  return objects;
}

function scoreOperationsJson(candidate: string, fullText: string): number {
  try {
    const parsed = parseJsonc(candidate) as {
      operations?: unknown[];
      conversationId?: string;
    };

    if (!Array.isArray(parsed.operations) || parsed.operations.length === 0) {
      return -1;
    }

    const validCount = parsed.operations.filter(
      (operation) =>
        operation &&
        typeof operation === 'object' &&
        typeof (operation as { action?: unknown }).action === 'string',
    ).length;

    if (validCount === 0) {
      return -1;
    }

    let score = validCount * 100;
    if (parsed.conversationId) {
      score += 10;
    }

    const position = fullText.lastIndexOf(candidate);
    if (position >= 0) {
      score += Math.min(50, Math.floor(position / 100));
    }

    return score;
  } catch {
    return -1;
  }
}

function extractBalancedJson(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const jsonOnly = /^```json\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (jsonOnly?.[1]) {
    return jsonOnly[1].trim();
  }
  return trimmed;
}
