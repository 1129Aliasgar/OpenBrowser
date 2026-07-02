#!/usr/bin/env node
import crypto from 'node:crypto';
import { stdout as output } from 'node:process';
import { Command } from 'commander';
import { submitPrompt, waitForSessionResponse } from './client/bridge-client.js';
import {
  formatAgentContextJson,
  formatContextMarkdown,
  generateContext,
  listContextChoices,
  loadContextAttachments,
  parseAtRefs,
  readBufferedPrompt,
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
import {
  AgentStepTracker,
  colors,
  formatError,
  formatModeChoicePrompt,
  formatModePrompt,
  printBanner,
  printModeMenu,
  WaitingSpinner,
  writeAnswerBlock,
  writeAtHint,
  writeDiffBlock,
  writeError,
  writeInfo,
  writeSessionEnd,
  writeSuccess,
  writeWarning,
  type TrackerStep,
} from './shared/index.js';

const program = new Command();
const DEFAULT_PORT = Number(process.env.PORT ?? 5000);

const sessionPrimingState = {
  askPrimed: false,
  agentPrimed: false,
};

interface RunOptions {
  contextPaths?: string[];
  interactive?: boolean;
}

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
      printBanner();
      await runAsk(prompt);
    });
  });

program
  .command('agent')
  .description('Run agent mode with file operations and diff preview')
  .argument('<task>', 'Task description for the AI agent')
  .action(async (task: string) => {
    await withBridge(async () => {
      printBanner();
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
  printBanner();

  const choices = await listContextChoices(process.cwd());

  while (true) {
    const mode = await chooseMode(choices);
    if (mode === 'exit') {
      writeSessionEnd('goodbye');
      break;
    }

    const { prompt, contextPaths } = await readPromptWithContext(mode, choices);
    if (!prompt && contextPaths.length === 0) {
      continue;
    }

    if (mode === 'ask') {
      await runAsk(prompt, { contextPaths, interactive: true });
    } else {
      await runAgent(prompt, { contextPaths, interactive: true });
    }

    writeSessionEnd(mode === 'ask' ? 'ask session complete' : 'agent session complete');
  }
}

async function chooseMode(
  choices: string[],
): Promise<'ask' | 'agent' | 'exit'> {
  printModeMenu();

  while (true) {
    const answer = (
      await readBufferedPrompt(formatModeChoicePrompt(), { choices })
    ).trim().toLowerCase();
    if (answer === '1' || answer === 'ask') {
      return 'ask';
    }
    if (answer === '2' || answer === 'agent') {
      return 'agent';
    }
    if (answer === 'q' || answer === 'quit' || answer === 'exit') {
      return 'exit';
    }
    writeWarning('Choose 1, 2, or q.');
  }
}

async function readPromptWithContext(
  mode: 'ask' | 'agent',
  choices: string[],
): Promise<{ prompt: string; contextPaths: string[] }> {
  writeAtHint();

  while (true) {
    const line = (await readBufferedPrompt(formatModePrompt(mode), { choices })).trim();

    if (!line) {
      continue;
    }

    const { cleanPrompt, paths: contextPaths } = parseAtRefs(line);
    return { prompt: cleanPrompt || line, contextPaths };
  }
}

async function waitForBrowserResponse(sessionId: string): Promise<string> {
  return waitForSessionResponse(sessionId, {
    port: DEFAULT_PORT,
  });
}

function formatAttachmentSummary(
  fileCount: number,
  directoryCount: number,
): string {
  const parts: string[] = [];
  if (fileCount > 0) {
    parts.push(`${fileCount} file(s)`);
  }
  if (directoryCount > 0) {
    parts.push(`${directoryCount} folder tree(s)`);
  }
  return parts.join(', ');
}

async function runAsk(prompt: string, options: RunOptions = {}): Promise<void> {
  const tracker = new AgentStepTracker();
  const conversationId = crypto.randomUUID();
  const { cleanPrompt, paths } = parseAtRefs(prompt);
  const contextPaths = [...new Set([...(options.contextPaths ?? []), ...paths])];
  const userPrompt = cleanPrompt || prompt;
  const markdownDraft = isMarkdownDraftRequest(userPrompt);
  const systemPrompt = buildAskSystemPrompt({ markdownDraft });
  const shouldIncludeSystemPrompt = !sessionPrimingState.askPrimed || !options.interactive;

  let contextBlock = '';
  if (contextPaths.length > 0) {
    tracker.step('reading project', `${contextPaths.length} context reference(s)`);
    const attachment = await loadContextAttachments(process.cwd(), contextPaths);
    contextBlock = formatContextMarkdown(attachment.files, attachment.directories);
    if (attachment.files.length === 0 && attachment.directories.length === 0) {
      writeWarning(
        `@ references [${contextPaths.join(', ')}] matched nothing. Use Tab after @ to complete paths.`,
      );
    } else {
      writeInfo(`attached ${formatAttachmentSummary(attachment.files.length, attachment.directories.length)} as Markdown context`);
    }
  }

  const message = buildFullMessage('ask', systemPrompt, userPrompt, contextBlock, {
    includeSystemInstructions: shouldIncludeSystemPrompt,
  });

  tracker.step('reading browser', markdownDraft ? 'sending markdown draft' : 'sending prompt');
  writeInfo('sending to browser AI (open ChatGPT with the extension loaded)');
  if (markdownDraft) {
    writeInfo('draft mode: AI will return a markdown block for you to copy');
  }

  const spinner = new WaitingSpinner();
  spinner.start('waiting for response');

  const { sessionId } = await submitPrompt({
    mode: 'ask',
    prompt: userPrompt,
    systemPrompt,
    message,
    conversationId,
    markdownDraft,
  });

  try {
    const answer = await waitForBrowserResponse(sessionId);
    spinner.stop();
    sessionPrimingState.askPrimed = true;

    tracker.complete(markdownDraft ? 'markdown draft received' : 'response received');
    writeAnswerBlock(answer || '(empty response)');

    if (markdownDraft && answer?.trim()) {
      const draft = extractMarkdownDraftContent(answer);
      if (draft && draft.length > 0) {
        output.write(`\n${colors.dim}--- Markdown draft (copy below) ---${colors.reset}\n\n`);
        output.write(draft);
        output.write(`\n\n${colors.dim}--- End draft ---${colors.reset}\n`);
      } else {
        writeWarning('Could not extract markdown draft. Copy the markdown block from the browser.');
      }
      writeInfo('to create the file in your project, switch to agent mode and say: create README.md');
    }
  } catch (error) {
    spinner.stop();
    writeError(`Ask error: ${formatError(error)}`);
  } finally {
    if (!options.interactive) {
      writeSessionEnd('ask session complete');
    }
  }
}

async function runAgent(task: string, options: RunOptions = {}): Promise<void> {
  const tracker = new AgentStepTracker();
  tracker.step('reading project', process.cwd());

  const { cleanPrompt, paths } = parseAtRefs(task);
  const contextPaths = [...new Set([...(options.contextPaths ?? []), ...paths])];
  const userTask = cleanPrompt || task;

  const projectSummary = await generateContext(process.cwd());
  const attachment =
    contextPaths.length > 0
      ? await loadContextAttachments(process.cwd(), contextPaths)
      : { files: [], directories: [] };
  const context = formatAgentContextJson(
    attachment.files,
    projectSummary,
    attachment.directories,
  );

  if (attachment.files.length > 0 || attachment.directories.length > 0) {
    writeInfo(
      `attached ${formatAttachmentSummary(attachment.files.length, attachment.directories.length)} as JSON context`,
    );
  } else if (contextPaths.length > 0) {
    writeWarning(
      `@ references [${contextPaths.join(', ')}] matched nothing. Use Tab after @ to complete paths.`,
    );
  }

  const conversationId = crypto.randomUUID();
  const systemPrompt = buildAgentSystemPrompt(conversationId);
  let hasRetriedWithFullSystem = false;
  let message = buildFullMessage('agent', systemPrompt, userTask, context, {
    includeSystemInstructions: !sessionPrimingState.agentPrimed || !options.interactive,
  });

  const maxAttempts = 3;
  let raw = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    tracker.step('reading browser', `attempt ${attempt}/${maxAttempts}`);
    writeInfo('sending to browser AI (open ChatGPT with the extension loaded)');

    const spinner = new WaitingSpinner();
    spinner.start('waiting for agent response');

    const { sessionId } = await submitPrompt({
      mode: 'agent',
      prompt: userTask,
      systemPrompt,
      message,
      conversationId,
    });

    try {
      raw = await waitForBrowserResponse(sessionId);
      spinner.stop();
    } catch (error) {
      spinner.stop();
      const captureError = formatError(error);
      if (attempt >= maxAttempts) {
        writeError(`Agent error: ${captureError}`);
        return;
      }

      writeWarning(`Browser capture failed (${captureError}). Retrying...`);
      const retryBody = buildAgentCompactRetryMessage(captureError, conversationId, userTask);
      const includeSystem = !hasRetriedWithFullSystem;
      message = buildFullMessage('agent', systemPrompt, retryBody, context, {
        includeSystemInstructions: includeSystem,
      });
      if (includeSystem) {
        hasRetriedWithFullSystem = true;
      }
      continue;
    }

    if (!raw.trim()) {
      if (attempt >= maxAttempts) {
        tracker.complete('no operations received');
        return;
      }

      writeWarning('Empty browser response. Retrying...');
      const retryBody = buildAgentCompactRetryMessage(
        'Empty response from browser AI',
        conversationId,
        userTask,
      );
      const includeSystem = !hasRetriedWithFullSystem;
      message = buildFullMessage('agent', systemPrompt, retryBody, context, {
        includeSystemInstructions: includeSystem,
      });
      if (includeSystem) {
        hasRetriedWithFullSystem = true;
      }
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

      output.write(`\n${colors.bold}Changes preview${colors.reset} ${colors.dim}(${plans.length} operation(s))${colors.reset}\n`);
      for (const plan of plans) {
        writeDiffBlock(plan.diff);
      }

      const approved = await confirm('Apply these changes?');
      if (!approved) {
        tracker.complete('rejected');
        writeWarning('changes not applied');
        return;
      }

      if (hasMarkdownCreate) {
        writeInfo('README/.md content captured from a markdown block in the browser');
      }

      await executeOperations(operations, process.cwd(), {
        conversationId: payload.conversationId,
        onStep: (step, detail) => tracker.step(step as TrackerStep, detail),
      });
      writeSuccess(`applied ${operations.length} operation(s)`);
      tracker.complete(`applied ${operations.length} operation(s)`);
      sessionPrimingState.agentPrimed = true;
      return;
    } catch (error) {
      const validationError = formatError(error);
      if (attempt >= maxAttempts) {
        writeError(`Agent error: ${validationError}`);
        return;
      }

      writeWarning(`Invalid agent response (${validationError}). Retrying (${attempt}/${maxAttempts - 1})...`);
      const retryBody = buildAgentCompactRetryMessage(validationError, conversationId, userTask);
      const includeSystem = !hasRetriedWithFullSystem;
      message = buildFullMessage('agent', systemPrompt, retryBody, context, {
        includeSystemInstructions: includeSystem,
      });
      if (includeSystem) {
        hasRetriedWithFullSystem = true;
      }
    }
  }

  if (!options.interactive) {
    writeSessionEnd('agent session complete');
  }
}

async function confirm(question: string): Promise<boolean> {
  const prompt = `${colors.yellow}?${colors.reset} ${question} ${colors.dim}[y/N]${colors.reset} `;
  const answer = (await readBufferedPrompt(prompt)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}
