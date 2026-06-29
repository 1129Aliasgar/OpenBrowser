import { parse as parseJsonc } from 'jsonc-parser';
import { validateAIResponse, formatValidationError, type AIResponsePayload, type Operation } from '../protocol/index.js';
import {
  extractFileBlocks,
  mergeFileBlocksIntoOperations,
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

  const fileBlocks = extractFileBlocks(raw);
  const mergedOps = mergeFileBlocksIntoOperations(
    (validated.operations ?? []) as unknown as FileOperation[],
    fileBlocks,
    raw,
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
  const start = trimmed.indexOf('{');
  if (start === -1) {
    return trimmed;
  }

  let depth = 0;
  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return trimmed.slice(start);
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const jsonOnly = /^```json\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (jsonOnly?.[1]) {
    return jsonOnly[1].trim();
  }
  return trimmed;
}
