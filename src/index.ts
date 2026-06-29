#!/usr/bin/env node
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import type { Completer } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { Command } from 'commander';
import { submitPrompt, waitForSessionResponse } from './client/bridge-client.js';
import {
  formatAgentContextJson,
  formatContextMarkdown,
  generateContext,
  getAtCompletion,
  listContextChoices,
  loadContextFiles,
  parseAtRefs,
} from './context/index.js';
import { parseAIResponse } from './parser/index.js';
import { executeOperations, planOperations } from './operations/index.js';
import {
  buildAgentSystemPrompt,
  buildAskSystemPrompt,
  buildAgentCompactRetryMessage,
  buildFullMessage,
  isMarkdownDraftRequest,
} from './prompts/system.js';
import { extractMarkdownDraftContent } from './parser/markdown-agent.js';
import { startServer } from './server/index.js';
import { AgentStepTracker, AnswerStream, formatError, type TrackerStep } from './shared/index.js';

const program = new Command();
const DEFAULT_PORT = Number(process.env.PORT ?? 5000);

program
  .name('openbrowser')
  .description('Local CLI agent for browser-based AI coding assistants')
  .version('0.1.0');

program
  .command('ask')
  .description('Chat with AI and receive Markdown responses in the terminal')
  .argument('<prompt>', 'Question or prompt to send to AI')
  .action(async (prompt: string) => {
    await withBridge(async () => {
      await runAsk(prompt);
    });
  });

program
  .command('agent')
  .description('Run agent mode with file operations and diff preview')
  .argument('<task>', 'Task description for the AI agent')
  .action(async (task: string) => {
    await withBridge(async () => {
      await runAgent(task);
    });
  });

program
  .command('server')
  .description('Run only the local bridge server')
  .action(async () => {
    await startServer({ port: DEFAULT_PORT });
  });

if (process.argv.length <= 2) {
  await withBridge(runInteractive);
} else {
  await program.parseAsync();
}

async function withBridge<T>(callback: () => Promise<T>): Promise<T> {
  const server = await startServer({ port: DEFAULT_PORT });
  try {
    return await callback();
  } finally {
    await server.close();
  }
}

async function runInteractive(): Promise<void> {
  const choices = await listContextChoices(process.cwd());
  const completer: Completer = (line) => {
    const { completion } = getAtCompletion(line, choices);
    if (!completion) {
      return [[], line];
    }

    const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(line);
    const partial = atMatch?.[1] ?? '';
    const atPos = line.lastIndexOf(`@${partial}`);
    const completed = `${line.slice(0, atPos)}@${completion}`;
    return [[completed], line];
  };

  const rl = readline.createInterface({
    input,
    output,
    terminal: true,
    completer,
  });

  try {
    while (true) {
      const mode = await chooseMode(rl);
      if (mode === 'exit') {
        break;
      }

      const { prompt, contextPaths } = await readPromptWithContext(rl, mode);
      if (!prompt && contextPaths.length === 0) {
        continue;
      }

      if (mode === 'ask') {
        await runAsk(prompt, { rl, contextPaths });
      } else {
        await runAgent(prompt, { rl, contextPaths });
      }
    }
  } finally {
    rl.close();
  }
}

async function chooseMode(
  rl: readline.Interface,
): Promise<'ask' | 'agent' | 'exit'> {
  output.write('\nSelect mode:\n');
  output.write('  1. ask (chat / draft README & .md for manual copy)\n');
  output.write('  2. agent (create & edit project files)\n');
  output.write('  q. exit\n');

  while (true) {
    const answer = (await rl.question('mode> ')).trim().toLowerCase();
    if (answer === '1' || answer === 'ask') {
      return 'ask';
    }
    if (answer === '2' || answer === 'agent') {
      return 'agent';
    }
    if (answer === 'q' || answer === 'quit' || answer === 'exit') {
      return 'exit';
    }
    output.write('Choose 1, 2, or q.\n');
  }
}

async function readPromptWithContext(
  rl: readline.Interface,
  mode: 'ask' | 'agent',
): Promise<{ prompt: string; contextPaths: string[] }> {
  output.write('\nType @ for file suggestions (Tab to complete). Enter prompt when ready.\n');

  while (true) {
    const label = `${mode}> `;
    const line = (await rl.question(label)).trim();

    if (!line) {
      continue;
    }

    const { cleanPrompt, paths: contextPaths } = parseAtRefs(line);
    return { prompt: cleanPrompt || line, contextPaths };
  }
}

async function waitForBrowserResponse(
  sessionId: string,
  rl?: readline.Interface,
  options: { onChunk?: (text: string) => void } = {},
): Promise<string> {
  rl?.pause();
  try {
    return await waitForSessionResponse(sessionId, {
      port: DEFAULT_PORT,
      onChunk: options.onChunk,
    });
  } finally {
    rl?.resume();
  }
}

interface RunOptions {
  rl?: readline.Interface;
  contextPaths?: string[];
}

async function runAsk(prompt: string, options: RunOptions = {}): Promise<void> {
  const tracker = new AgentStepTracker();
  const conversationId = crypto.randomUUID();
  const { cleanPrompt, paths } = parseAtRefs(prompt);
  const contextPaths = [...new Set([...(options.contextPaths ?? []), ...paths])];
  const userPrompt = cleanPrompt || prompt;
  const markdownDraft = isMarkdownDraftRequest(userPrompt);
  const systemPrompt = buildAskSystemPrompt({ markdownDraft });

  let contextBlock = '';
  if (contextPaths.length > 0) {
    tracker.step('reading project', `${contextPaths.length} context reference(s)`);
    const files = await loadContextFiles(process.cwd(), contextPaths);
    contextBlock = formatContextMarkdown(files);
    if (files.length === 0) {
      output.write(
        `\nWarning: @ references [${contextPaths.join(', ')}] matched no files. Use Tab after @ to complete paths.\n`,
      );
    } else {
      output.write(`\nAttached ${files.length} file(s) as Markdown context.\n`);
    }
  }

  const message = buildFullMessage('ask', systemPrompt, userPrompt, contextBlock);

  tracker.step('reading browser', markdownDraft ? 'sending markdown draft to browser' : 'sending prompt to ChatGPT');
  output.write('\nSending to browser AI (open ChatGPT with the extension loaded)...\n');
  if (markdownDraft) {
    output.write('Draft mode: AI will return a ```markdown block for you to copy manually.\n');
  }

  const stream = new AnswerStream();
  stream.startWaiting();

  const { sessionId } = await submitPrompt({
    mode: 'ask',
    prompt: userPrompt,
    systemPrompt,
    message,
    conversationId,
    markdownDraft,
  });

  try {
    const answer = await waitForBrowserResponse(sessionId, options.rl, {
      onChunk: (text) => stream.onChunk(text),
    });

    tracker.complete(markdownDraft ? 'markdown draft received' : 'ask response received');
    stream.finish(answer || '(empty response)', { rewriteIfLonger: markdownDraft });

    if (markdownDraft && answer?.trim()) {
      const draft = extractMarkdownDraftContent(answer);
      if (draft && draft.length > 0) {
        output.write('\n--- Markdown draft (full copy — browser or below) ---\n\n');
        output.write(draft);
        output.write('\n\n--- End draft ---\n');
      } else {
        output.write(
          '\nCould not extract markdown draft from capture. Copy the ```markdown code block from the browser.\n',
        );
      }
      output.write(
        '\nTo create the file in your project, switch to agent mode and say: create README.md\n',
      );
    }
  } catch (error) {
    output.write(`\nAsk error: ${formatError(error)}\n`);
  }
}

async function runAgent(task: string, options: RunOptions = {}): Promise<void> {
  const tracker = new AgentStepTracker();
  tracker.step('reading project', process.cwd());

  const { cleanPrompt, paths } = parseAtRefs(task);
  const contextPaths = [...new Set([...(options.contextPaths ?? []), ...paths])];
  const userTask = cleanPrompt || task;

  const projectSummary = await generateContext(process.cwd());
  const attachedFiles =
    contextPaths.length > 0 ? await loadContextFiles(process.cwd(), contextPaths) : [];
  const context = formatAgentContextJson(attachedFiles, projectSummary);

  if (attachedFiles.length > 0) {
    output.write(`\nAttached ${attachedFiles.length} file(s) as JSON context.\n`);
  } else if (contextPaths.length > 0) {
    output.write(
      `\nWarning: @ references [${contextPaths.join(', ')}] matched no files. Use Tab after @ to complete paths.\n`,
    );
  }

  const conversationId = crypto.randomUUID();
  const systemPrompt = buildAgentSystemPrompt(conversationId);
  let message = buildFullMessage('agent', systemPrompt, userTask, context);

  const maxAttempts = 3;
  let raw = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    tracker.step('reading browser', `sending task to ChatGPT (attempt ${attempt}/${maxAttempts})`);
    output.write('\nSending to browser AI (open ChatGPT with the extension loaded)...\n');

    const { sessionId } = await submitPrompt({
      mode: 'agent',
      prompt: userTask,
      systemPrompt,
      message,
      conversationId,
    });

    try {
      raw = await waitForBrowserResponse(sessionId, options.rl);
    } catch (error) {
      const captureError = formatError(error);
      if (attempt >= maxAttempts) {
        output.write(`\nAgent error: ${captureError}\n`);
        return;
      }

      output.write(`\nBrowser capture failed (${captureError}). Retrying...\n`);
      message = buildAgentCompactRetryMessage(captureError, conversationId, userTask);
      continue;
    }

    if (!raw.trim()) {
      if (attempt >= maxAttempts) {
        tracker.complete('no operations received');
        return;
      }

      output.write('\nEmpty browser response. Retrying...\n');
      message = buildAgentCompactRetryMessage('Empty response from browser AI', conversationId, userTask);
      continue;
    }

    try {
      tracker.step('loading', 'validating AI response');
      const payload = parseAIResponse(raw, { conversationId });
      if (payload.error) {
        throw new Error(payload.error);
      }

      const operations = payload.operations ?? [];
      const hasMarkdownCreate = operations.some(
        (op) => op.action === 'CREATE_FILE' && /\.md$/i.test(op.path ?? ''),
      );

      const plans = await planOperations(operations, process.cwd());

      for (const plan of plans) {
        output.write(`\n${plan.diff}\n`);
      }

      const approved = await confirm('Apply these changes?', options.rl);
      if (!approved) {
        tracker.complete('rejected');
        return;
      }

      if (hasMarkdownCreate) {
        output.write(
          '\nNote: README/.md content was captured from a ```markdown code block in the browser.\n',
        );
      }

      await executeOperations(operations, process.cwd(), {
        conversationId: payload.conversationId,
        onStep: (step, detail) => tracker.step(step as TrackerStep, detail),
      });
      tracker.complete(`applied ${operations.length} operation(s)`);
      return;
    } catch (error) {
      const validationError = formatError(error);
      if (attempt >= maxAttempts) {
        output.write(`\nAgent error: ${validationError}\n`);
        return;
      }

      output.write(`\nInvalid agent response (${validationError}). Retrying (${attempt}/${maxAttempts - 1})...\n`);
      message = buildAgentCompactRetryMessage(validationError, conversationId, userTask);
    }
  }
}

async function confirm(
  question: string,
  existingRl?: readline.Interface,
): Promise<boolean> {
  const rl = existingRl ?? readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    if (!existingRl) {
      rl.close();
    }
  }
}
