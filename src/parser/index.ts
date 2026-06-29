import { parse as parseJsonc } from 'jsonc-parser';
import { validateAIResponse, type AIResponsePayload } from '../protocol/index.js';

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

  return validateAIResponse(payload);
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
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}
