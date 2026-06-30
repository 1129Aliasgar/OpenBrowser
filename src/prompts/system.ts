import type { SessionMode } from '../server/session-store.js';

const OB_FILE_BEGIN = '---OB_FILE_BEGIN:';
const OB_FILE_END = '---OB_FILE_END---';

const RUN_COMMAND_EXAMPLE = `{
  "operations": [
    { "action": "RUN_COMMAND", "command": "docker compose up -d" }
  ],
  "conversationId": "<uuid-v4>"
}`;

const DOCKER_COMPOSE_YAML_EXAMPLE = `${OB_FILE_BEGIN} docker-compose.yml---
version: "3.8"
services:
  mongodb:
    image: mongo:latest
    container_name: mongodb_server
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - C:/data/db:/data/db
    command: mongod --bind_ip_all
${OB_FILE_END}`;

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

${OB_FILE_BEGIN} package.json---
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
${OB_FILE_END}

${OB_FILE_BEGIN} src/controllers/userController.js---
const users = [{ id: 1, name: 'Alice' }];

exports.listUsers = (_req, res) => {
  res.json(users);
};
${OB_FILE_END}

${OB_FILE_BEGIN} src/routes/userRoutes.js---
const express = require('express');
const { listUsers } = require('../controllers/userController');

const router = express.Router();
router.get('/', listUsers);

module.exports = router;
${OB_FILE_END}

${OB_FILE_BEGIN} src/server.js---
const express = require('express');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use('/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server on \${PORT}\`));
${OB_FILE_END}`;

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

const README_MARKDOWN_EXAMPLE = `{
  "operations": [
    { "action": "CREATE_FILE", "path": "README.md" }
  ],
  "conversationId": "<uuid-v4>"
}

\`\`\`markdown
# My Express API

A simple Express.js API with sample endpoints.

## Features

- Sample users endpoint
- Random joke endpoint

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`
\`\`\``;

export function isMarkdownDraftRequest(prompt: string): boolean {
  return /\b(readme(?:\.md)?|\.md\b|markdown\s+file)\b/i.test(prompt);
}

export function buildAskSystemPrompt(options: { markdownDraft?: boolean } = {}): string {
  if (options.markdownDraft) {
    return [
      'You are connected to OpenBrowser ask mode (markdown draft).',
      '',
      'The user wants to draft a README or .md file for manual copy — do NOT create files.',
      '',
      'Rules:',
      '- Return ONE fenced code block with language tag markdown containing the full file source.',
      '- Use real Markdown syntax: # headings, ## subheadings, - bullet lists, `inline code`, blank lines between sections.',
      '- Do NOT return JSON or OpenBrowser operations.',
      '- Do NOT format the README as chat preview (no citation cards, tables UI, or rendered GitHub-style layout).',
      '- Put the entire file inside a single ```markdown ... ``` block so the user can copy it.',
      '- Shell examples inside the README may use nested ```bash blocks inside the markdown block.',
      '',
      'Example shape:',
      '```markdown',
      '# Project Title',
      '',
      'Short description.',
      '',
      '## Features',
      '',
      '- Feature one',
      '```',
    ].join('\n');
  }

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
    '### PART 1 — JSON operations header (required first)',
    '- Always start your reply with the JSON operations object.',
    '- Metadata only: paths, commands, line numbers.',
    '- Do NOT put file bodies inside JSON strings.',
    `- "conversationId" must be exactly: ${conversationId}`,
    '',
    '### PART 2 — OpenBrowser file blocks (plain text, NOT code fences)',
    `- One block per file using ${OB_FILE_BEGIN} path--- / ${OB_FILE_END}`,
    `- The path on ${OB_FILE_BEGIN} MUST exactly match the operation path in JSON.`,
    '- Paste FULL source between BEGIN and END with real line breaks.',
    '- Do NOT use markdown ``` code fences for file content.',
    '- Do NOT use ChatGPT/Gemini file attachment UI, canvas, copy-code widgets, or download cards.',
    '- Write file content directly in the chat message as plain text between the markers.',
    '- Put the BEGIN marker on its own line, then file source on following lines, then END on its own line.',
    '',
    'Block format:',
    `${OB_FILE_BEGIN} relative/path.ext---`,
    '<full file source, plain text>',
    OB_FILE_END,
    '',
    '## Allowed actions',
    'CREATE_FILE, EDIT_FILE, DELETE_FILE, RENAME_FILE, CREATE_FOLDER, RUN_COMMAND',
    '',
    '## CREATE_FILE rules',
    '- Use for new files (including package.json).',
    `- For code/config files (.js, .ts, .json, etc.): use ${OB_FILE_BEGIN} path--- blocks with complete content.`,
    '- For README.md and any .md file: use ONE ```markdown fenced block (see below) — NOT OB_FILE blocks.',
    '- Prefer CREATE_FILE over EDIT_FILE for new projects.',
    '',
    '## Markdown files (.md, README) — copy-paste fence only',
    '- When creating or rewriting README.md or any .md file:',
    '  1) JSON: { "action": "CREATE_FILE", "path": "README.md" }',
    '  2) Content: ONE ```markdown ... ``` block with full raw Markdown source after the JSON.',
    '- The ```markdown block must be copy-pasteable plain text (# headings visible as characters).',
    '- Do NOT use OB_FILE markers for .md files.',
    '- Do NOT render the README as chat preview; write literal markdown source inside the fence.',
    '- Use # / ## headings, - lists, `inline code`. Nested ```bash inside the markdown block is OK.',
    '- To draft without creating a file, the user should use ask mode instead.',
    '',
    '## EDIT_FILE rules',
    `- If the file does NOT exist yet: use CREATE_FILE or EDIT_FILE with a ${OB_FILE_BEGIN} block (full content).`,
    '- If the file ALREADY exists (see project context with line numbers):',
    '  - Prefer partial edit: { "action": "EDIT_FILE", "path": "...", "startLine": N, "endLine": M, "replace": "single line or use \\\\n" }',
    '  - Or search/replace: { "search": "old", "replace": "new" }',
    `- Or full rewrite: ${OB_FILE_BEGIN} path--- for code files, or \`\`\`markdown block for .md files`,
    `- For full file rewrites, prefer ${OB_FILE_BEGIN} blocks — do NOT put multiline code inside JSON "replace".`,
    '- Escape quotes in JSON strings (use \\" inside replace).',
    '- Do NOT use EDIT_FILE on package.json right after npm init — use CREATE_FILE with full package.json instead.',
    '',
    '## RUN_COMMAND rules (commands in JSON only)',
    '- ALL terminal, shell, and docker commands MUST appear ONLY in JSON:',
    '  { "action": "RUN_COMMAND", "command": "your command here" }',
    '- Never put runnable commands only in markdown/bash/shell copy-paste blocks (```bash, ```sh, ```shell, etc.).',
    '- For command-only requests (e.g. "how do I run this file?"), a JSON-only response is sufficient — no OB_FILE blocks needed.',
    '- Put multiple steps in one command with && or ; — do not split commands across separate markdown fences.',
    '',
    '## YAML files (.yml, .yaml, docker-compose.yml)',
    `- Use ${OB_FILE_BEGIN} path--- blocks with real line breaks and indentation (same as .js/.json).`,
    '- Preserve YAML structure: version, services, nested keys each on their own lines.',
    '- Do NOT use ```yaml markdown fences — use OB_FILE blocks for .yml/.yaml files.',
    '',
    '## Other rules',
    '- RUN_COMMAND runs in project root; use "cd folder && cmd" when needed.',
    '- Paths must be relative. No ../ traversal. No "..." placeholders.',
    `- Every CREATE_FILE / EDIT_FILE that needs full content must include content: OB blocks for code files, \`\`\`markdown for .md files.`,
    '',
    '## Full example (new Express app)',
    HYBRID_EXPRESS_EXAMPLE,
    '',
    '## Example (edit existing file by line number)',
    EDIT_EXISTING_EXAMPLE,
    '',
    '## Example (RUN_COMMAND only — JSON, no bash block)',
    RUN_COMMAND_EXAMPLE,
    '',
    '## Example (YAML file — OB_FILE with line breaks)',
    `{ "operations": [{ "action": "CREATE_FILE", "path": "docker-compose.yml" }], "conversationId": "${conversationId}" }`,
    '',
    DOCKER_COMPOSE_YAML_EXAMPLE,
    '',
    '## Example (README.md — use markdown fence, not OB_FILE)',
    README_MARKDOWN_EXAMPLE,
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
    `2) ${OB_FILE_BEGIN} relative/path--- ... ${OB_FILE_END} for EVERY file that needs content`,
    `3) Each ${OB_FILE_BEGIN} path must exactly match the operation path — never swap files`,
    '',
    `conversationId: ${conversationId}`,
    '',
    'CREATE_FILE / new files:',
    `- Code files: CREATE_FILE in JSON + ${OB_FILE_BEGIN} path--- with full plain-text source`,
    '- .md / README: CREATE_FILE in JSON + one ```markdown ... ``` block with full raw markdown source',
    '- Include package.json as CREATE_FILE (not EDIT_FILE) when scaffolding a new app',
    '',
    'EDIT_FILE:',
    `- File missing → CREATE_FILE or EDIT_FILE with full ${OB_FILE_BEGIN} content (file will be created)`,
    `- File exists → use startLine/endLine/replace OR search/replace OR full ${OB_FILE_BEGIN} rewrite`,
    '',
    'RUN_COMMAND:',
    '- Commands go ONLY in JSON: { "action": "RUN_COMMAND", "command": "..." }',
    '- Never use ```bash / ```sh / ```shell blocks for runnable commands',
    '- Command-only replies need JSON only (no file blocks)',
    '',
    'YAML (.yml / .yaml):',
    `- Use ${OB_FILE_BEGIN} path--- with real line breaks — NOT \`\`\`yaml fences`,
    '',
    'Markdown (.md) files:',
    '- Use ONE ```markdown fenced block with raw # heading source — NOT OB_FILE markers.',
    '- Do NOT render README as chat preview.',
    '',
    'Do NOT use:',
    '- OB_FILE markers for .md files (use ```markdown instead)',
    '- Markdown ``` fences for non-.md code files (use OB_FILE for .js, .json, .yml, etc.)',
    '- ```bash / ```sh blocks instead of JSON RUN_COMMAND',
    '- File attachment / canvas / copy-code UI',
    '- Bare code without OB_FILE markers',
    '- JSON-only operations without file blocks',
    `- Multiline source inside JSON replace (use ${OB_FILE_BEGIN} instead)`,
    '',
    'Minimal example:',
    `{ "operations": [{ "action": "CREATE_FILE", "path": "package.json" }], "conversationId": "${conversationId}" }`,
    '',
    `${OB_FILE_BEGIN} package.json---`,
    '{ "name": "app", "version": "1.0.0" }',
    OB_FILE_END,
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
