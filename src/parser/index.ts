import { validateAIResponse, type AIResponsePayload } from '../protocol/index.js';

export function parseAIResponse(raw: string): AIResponsePayload {
  const parsed: unknown = JSON.parse(stripJsonFence(raw));
  return validateAIResponse(parsed);
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match?.[1] ?? trimmed;
}
