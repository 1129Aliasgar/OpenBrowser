import type { SessionMode } from '../server/session-store.js';

const AGENT_SCHEMA = `{
  "operations": [
    {
      "action": "CREATE_FILE | EDIT_FILE | DELETE_FILE | RENAME_FILE | CREATE_FOLDER",
      "path": "relative/path/from/project/root",
      "content": "full file content for CREATE/EDIT",
      "search": "text to find for EDIT",
      "replace": "replacement text for EDIT or destination for RENAME"
    }
  ],
  "conversationId": "<uuid-v4>"
}`;

export function buildAskSystemPrompt(): string {
  return [
    'You are connected to OpenBrowser, a local CLI coding assistant.',
    '',
    'Rules:',
    '- Respond in clear Markdown.',
    '- Answer the user question directly.',
    '- Do NOT return JSON.',
    '- Do NOT wrap the entire answer in a code fence.',
    '- Keep responses concise and terminal-friendly.',
  ].join('\n');
}

export function buildAgentSystemPrompt(conversationId: string): string {
  return [
    'You are connected to OpenBrowser agent mode.',
    '',
    'You MUST respond with ONLY valid JSON matching this schema:',
    AGENT_SCHEMA,
    '',
    'Rules:',
    `- Set "conversationId" to exactly: ${conversationId}`,
    '- No markdown fences, no extra text, no explanations outside JSON.',
    '- Every path must be relative to the project root.',
    '- Directory traversal (../) is prohibited.',
    '- If you cannot comply, return: {"operations":[],"conversationId":"' +
      conversationId +
      '","error":"reason"}',
  ].join('\n');
}

export function buildFullMessage(
  mode: SessionMode,
  systemPrompt: string,
  userPrompt: string,
  context?: string,
): string {
  const parts = [
    '--- OpenBrowser System Instructions ---',
    systemPrompt,
    '--- End System Instructions ---',
  ];

  if (mode === 'ask' && context) {
    parts.push('', context);
  }

  if (mode === 'agent' && context) {
    parts.push('', '--- Project Context (JSON) ---', context, '--- End Project Context ---');
  }

  parts.push('', '--- User Request ---', userPrompt);
  return parts.join('\n');
}
