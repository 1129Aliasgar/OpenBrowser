import type { SessionMode } from '../server/session-store.js';

const HYBRID_EXPRESS_EXAMPLE = `{
  "operations": [
    { "action": "RUN_COMMAND", "command": "npm init -y && npm install express" },
    { "action": "CREATE_FOLDER", "path": "src/controllers" },
    { "action": "CREATE_FOLDER", "path": "src/routes" },
    { "action": "CREATE_FILE", "path": "package.json" },
    { "action": "CREATE_FILE", "path": "src/controllers/userController.js" },
    { "action": "CREATE_FILE", "path": "src/routes/userRoutes.js" },
    { "action": "CREATE_FILE", "path": "src/server.js" }
  ],
  "conversationId": "<uuid-v4>"
}

\`\`\`file:package.json
{
  "name": "express-app",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
\`\`\`

\`\`\`file:src/controllers/userController.js
const users = [{ id: 1, name: 'Alice' }];

exports.listUsers = (_req, res) => {
  res.json(users);
};
\`\`\`

\`\`\`file:src/routes/userRoutes.js
const express = require('express');
const { listUsers } = require('../controllers/userController');

const router = express.Router();
router.get('/', listUsers);

module.exports = router;
\`\`\`

\`\`\`file:src/server.js
const express = require('express');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use('/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server on \${PORT}\`));
\`\`\``;

const EDIT_EXISTING_EXAMPLE = `{
  "operations": [
    {
      "action": "EDIT_FILE",
      "path": "src/server.js",
      "startLine": 8,
      "endLine": 8,
      "replace": "app.use('/api/users', userRoutes);"
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
    '## Response format (required)',
    '',
    'Return ONE message with two parts:',
    '',
    '### PART 1 — JSON operations header',
    '- Metadata only: paths, commands, line numbers.',
    '- Do NOT put file bodies inside JSON strings.',
    `- "conversationId" must be exactly: ${conversationId}`,
    '',
    '### PART 2 — File content blocks',
    '- One markdown fence per file: ```file:relative/path.ext',
    '- Paste FULL source code inside each fence.',
    '- Do NOT use ChatGPT/Gemini file attachment UI, canvas, or download cards.',
    '- Do NOT paste bare code without ```file:path``` fences.',
    '',
    '## Allowed actions',
    'CREATE_FILE, EDIT_FILE, DELETE_FILE, RENAME_FILE, CREATE_FOLDER, RUN_COMMAND',
    '',
    '## CREATE_FILE rules',
    '- Use for new files (including package.json).',
    '- Always include a matching ```file:path``` block with complete content.',
    '- Prefer CREATE_FILE over EDIT_FILE for new projects.',
    '',
    '## EDIT_FILE rules',
    '- If the file does NOT exist yet: OpenBrowser will create it, but you must provide full content in a ```file:path``` block.',
    '- If the file ALREADY exists (see project context with line numbers):',
    '  - Prefer partial edit: { "action": "EDIT_FILE", "path": "...", "startLine": N, "endLine": M, "replace": "new lines" }',
    '  - Or search/replace: { "search": "old", "replace": "new" }',
    '  - Or full rewrite: ```file:path``` block with entire updated file',
    '- Do NOT use EDIT_FILE on package.json right after npm init — use CREATE_FILE with full package.json instead.',
    '',
    '## Other rules',
    '- RUN_COMMAND runs in project root; use "cd folder && cmd" when needed.',
    '- Paths must be relative. No ../ traversal. No "..." placeholders.',
    '- Every CREATE_FILE and every EDIT_FILE that needs full content must have a ```file:path``` block.',
    '',
    '## Full example (new Express app)',
    HYBRID_EXPRESS_EXAMPLE,
    '',
    '## Example (edit existing file by line number)',
    EDIT_EXISTING_EXAMPLE,
  ].join('\n');
}

export function buildAgentRetryMessage(
  originalMessage: string,
  validationError: string,
  conversationId: string,
): string {
  return [
    originalMessage,
    '',
    '--- OpenBrowser Validation Error ---',
    validationError,
    '',
    buildRetryFormatInstructions(conversationId),
  ].join('\n');
}

export function buildAgentCompactRetryMessage(
  validationError: string,
  conversationId: string,
  userTask: string,
): string {
  return [
    '--- OpenBrowser Agent Retry ---',
    `Task: ${userTask}`,
    '',
    '--- Validation Error (fix this) ---',
    validationError,
    '--- End Validation Error ---',
    '',
    buildRetryFormatInstructions(conversationId),
  ].join('\n');
}

function buildRetryFormatInstructions(conversationId: string): string {
  return [
    'Your previous reply failed validation. Reply again in ONE message.',
    '',
    'Required structure:',
    '1) JSON operations array + conversationId',
    '2) ```file:relative/path``` fenced block for EVERY file that needs content',
    '',
    `conversationId: ${conversationId}`,
    '',
    'CREATE_FILE / new files:',
    '- Use CREATE_FILE in JSON + ```file:path``` with full source',
    '- Include package.json as CREATE_FILE (not EDIT_FILE) when scaffolding a new app',
    '',
    'EDIT_FILE:',
    '- File missing → CREATE_FILE or EDIT_FILE with full ```file:path``` content (file will be created)',
    '- File exists → use startLine/endLine/replace OR search/replace OR full ```file:path``` rewrite',
    '',
    'Do NOT use:',
    '- File attachment / canvas UI',
    '- Bare code without ```file:path``` fences',
    '- JSON-only operations without code blocks',
    '',
    'Minimal example:',
    `{ "operations": [{ "action": "CREATE_FILE", "path": "package.json" }], "conversationId": "${conversationId}" }`,
    '',
    '```file:package.json',
    '{ "name": "app", "version": "1.0.0" }',
    '```',
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
