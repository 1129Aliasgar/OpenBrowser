import crypto from 'node:crypto';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { generateContext } from '../context/index.js';
import { writePromptFile, readPromptFile } from '../memory/index.js';
import { executeOperations, planOperations } from '../operations/index.js';
import { validateOperations } from '../protocol/index.js';
import { logger } from '../shared/index.js';
import {
  PROMPT_FILE_COMPOSER_NOTE,
  PROMPT_FILE_NAME,
  shouldDeliverPromptAsFile,
} from '../shared/prompt-delivery.js';
import {
  addBrowserClient,
  broadcastBrowserJob,
  createSseStream,
  writeCorsPreflight,
  addSessionClient,
  notifySessionComplete,
  notifySessionChunk,
  notifySessionError,
  removeBrowserClient,
  removeSessionClient,
  sendSseEvent,
  startSessionHeartbeat,
} from './sse-hub.js';
import {
  completeSession,
  createSession,
  failSession,
  getSession,
  tryClaimSession,
  updateSessionPartial,
} from './session-store.js';

const PORT = Number(process.env.PORT ?? 5000);

interface ServerOptions {
  port?: number;
  host?: string;
}

export async function createBridgeServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('Access-Control-Allow-Private-Network', 'true');
  });

  app.options('/browser/events', async (request, reply) => {
    reply.hijack();
    writeCorsPreflight(reply.raw, request.headers.origin);
  });

  app.options('/browser/claim', async (request, reply) => {
    reply.hijack();
    writeCorsPreflight(reply.raw, request.headers.origin);
  });

  app.options('/browser/chunk', async (request, reply) => {
    reply.hijack();
    writeCorsPreflight(reply.raw, request.headers.origin);
  });

  app.options('/browser/response', async (request, reply) => {
    reply.hijack();
    writeCorsPreflight(reply.raw, request.headers.origin);
  });

  app.options('/browser/prompt-file/:sessionId', async (request, reply) => {
    reply.hijack();
    writeCorsPreflight(reply.raw, request.headers.origin);
  });

  app.addHook('preHandler', async (request) => {
    authenticate(request);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/summary', async () => ({
    context: await generateContext(process.cwd()),
  }));

  app.post('/operations/preview', async (request) => {
    const operations = validateOperations((request.body as { operations?: unknown }).operations);
    return { operations: await planOperations(operations, process.cwd()) };
  });

  app.post('/operations/apply', async (request) => {
    const body = request.body as {
      operations?: unknown;
      conversationId?: string;
    };
    const operations = validateOperations(body.operations);
    return {
      operations: await executeOperations(operations, process.cwd(), {
        conversationId: body.conversationId,
      }),
    };
  });

  app.post('/session', async () => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }));

  app.post('/session/prompt', async (request) => {
    const body = request.body as {
      mode?: 'ask' | 'agent';
      prompt?: string;
      systemPrompt?: string;
      message?: string;
      conversationId?: string;
      markdownDraft?: boolean;
    };

    if (!body.mode || !body.prompt || !body.systemPrompt || !body.message || !body.conversationId) {
      throw new Error('mode, prompt, systemPrompt, message, and conversationId are required');
    }

    const delivery = shouldDeliverPromptAsFile(body.message) ? 'file' : 'text';
    const composerMessage =
      delivery === 'file' ? PROMPT_FILE_COMPOSER_NOTE : body.message;

    const session = createSession({
      mode: body.mode,
      prompt: body.prompt,
      systemPrompt: body.systemPrompt,
      message: body.message,
      composerMessage,
      delivery,
      conversationId: body.conversationId,
      markdownDraft: body.markdownDraft,
    });

    if (delivery === 'file') {
      await writePromptFile(process.cwd(), session.id, body.message);
      logger.info(
        { sessionId: session.id, chars: body.message.length },
        'Prompt saved as attachment file (exceeds injection limit)',
      );
    }

    logger.info({ sessionId: session.id, mode: session.mode, delivery }, 'Prompt session queued');

    broadcastBrowserJob({
      sessionId: session.id,
      mode: session.mode,
      message: composerMessage,
      composerMessage,
      delivery,
      promptFileName: delivery === 'file' ? PROMPT_FILE_NAME : undefined,
      systemPrompt: session.systemPrompt,
      conversationId: session.conversationId,
      markdownDraft: session.markdownDraft,
    });

    return { sessionId: session.id, status: session.status };
  });

  app.get('/session/:sessionId/status', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      sessionId: session.id,
      status: session.status,
      mode: session.mode,
      response: session.response,
      partialText: session.partialText,
      error: session.error,
    };
  });

  app.get('/session/:sessionId/events', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    reply.hijack();
    const raw = reply.raw;
    const origin = request.headers.origin;

    let heartbeat: ReturnType<typeof setInterval>;
    const client = createSseStream(raw, (closedClient) => {
      clearInterval(heartbeat);
      removeSessionClient(sessionId, closedClient);
    }, origin);

    if (session.status === 'complete') {
      sendSseEvent(raw, 'complete', { response: session.response });
      raw.end();
      return;
    }

    if (session.status === 'error') {
      sendSseEvent(raw, 'error', { error: session.error });
      raw.end();
      return;
    }

    addSessionClient(sessionId, client);
    heartbeat = startSessionHeartbeat(sessionId, client);

    if (session.partialText) {
      sendSseEvent(raw, 'chunk', { text: session.partialText });
    }
  });

  app.get('/browser/events', async (request, reply) => {
    reply.hijack();
    const raw = reply.raw;
    const origin = request.headers.origin;

    const client = createSseStream(raw, (closedClient) => {
      clearInterval(heartbeat);
      removeBrowserClient(closedClient);
    }, origin);

    addBrowserClient(client);
    const heartbeat = setInterval(() => {
      client.write(': heartbeat\n\n');
    }, 15_000);

    request.raw.on('close', () => clearInterval(heartbeat));
  });

  app.post('/browser/claim', async (request) => {
    const body = request.body as { sessionId?: string };
    if (!body.sessionId) {
      throw new Error('sessionId is required');
    }

    const session = tryClaimSession(body.sessionId);
    if (!session) {
      return { claimed: false };
    }

    return {
      claimed: true,
      job: {
        sessionId: session.id,
        mode: session.mode,
        message: session.composerMessage,
        composerMessage: session.composerMessage,
        delivery: session.delivery,
        promptFileName: session.delivery === 'file' ? PROMPT_FILE_NAME : undefined,
        systemPrompt: session.systemPrompt,
        conversationId: session.conversationId,
        markdownDraft: session.markdownDraft,
      },
    };
  });

  app.get('/browser/prompt-file/:sessionId', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = getSession(sessionId);

    if (!session || session.delivery !== 'file') {
      throw new Error('Prompt file not found');
    }

    const content = await readPromptFile(process.cwd(), sessionId);
    return {
      fileName: PROMPT_FILE_NAME,
      content,
    };
  });

  app.post('/browser/chunk', async (request) => {
    const body = request.body as {
      sessionId?: string;
      text?: string;
    };

    if (!body.sessionId || body.text === undefined) {
      throw new Error('sessionId and text are required');
    }

    const session = getSession(body.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    updateSessionPartial(body.sessionId, body.text);
    notifySessionChunk(body.sessionId, { text: body.text });
    return { accepted: true };
  });

  app.post('/browser/response', async (request) => {
    const body = request.body as {
      sessionId?: string;
      text?: string;
      error?: string;
    };

    if (!body.sessionId) {
      throw new Error('sessionId is required');
    }

    if (body.error) {
      failSession(body.sessionId, body.error);
      notifySessionError(body.sessionId, { error: body.error });
      logger.warn({ sessionId: body.sessionId, error: body.error }, 'Browser session failed');
      return { accepted: true, status: 'error' };
    }

    if (!body.text) {
      throw new Error('text or error is required');
    }

    completeSession(body.sessionId, body.text);
    notifySessionComplete(body.sessionId, { response: body.text });
    logger.info({ sessionId: body.sessionId }, 'Browser response received');

    return { accepted: true, status: 'complete' };
  });

  app.post('/browser/message', async (request) => {
    return {
      accepted: true,
      receivedAt: new Date().toISOString(),
      body: request.body,
    };
  });

  return app;
}

export async function startServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const app = await createBridgeServer();
  const port = options.port ?? PORT;
  const host = options.host ?? '127.0.0.1';
  await app.listen({ port, host });
  logger.info({ port, host }, 'Bridge server listening');
  return app;
}

function authenticate(request: FastifyRequest): void {
  if (request.method === 'OPTIONS') {
    return;
  }

  const url = request.url.split('?')[0] ?? request.url;

  if (
    url === '/health' ||
    url.startsWith('/browser/') ||
    /^\/session\/[^/]+\/(status|events)$/.test(url)
  ) {
    return;
  }

  const token = process.env.BRIDGE_TOKEN;
  if (!token) {
    return;
  }

  const header = request.headers.authorization;
  if (header !== `Bearer ${token}`) {
    throw new Error('Unauthorized bridge request');
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  startServer().catch((err) => {
    logger.error(err, 'Failed to start bridge server');
    process.exit(1);
  });
}
