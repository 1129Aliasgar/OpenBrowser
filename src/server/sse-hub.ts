import type { ServerResponse } from 'node:http';
import type { PromptSession } from './session-store.js';

export interface BrowserJobEvent {
  sessionId: string;
  mode: PromptSession['mode'];
  message: string;
  systemPrompt: string;
  conversationId: string;
  markdownDraft?: boolean;
}

interface SseClient {
  write: (chunk: string) => void;
  close: () => void;
}

const browserClients = new Set<SseClient>();
const sessionClients = new Map<string, Set<SseClient>>();
const pendingBrowserJobs: BrowserJobEvent[] = [];

export function applyCorsHeaders(
  raw: ServerResponse,
  origin?: string,
): void {
  if (origin) {
    raw.setHeader('Access-Control-Allow-Origin', origin);
    raw.setHeader('Vary', 'Origin');
  } else {
    raw.setHeader('Access-Control-Allow-Origin', '*');
  }

  raw.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  raw.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  raw.setHeader('Access-Control-Allow-Private-Network', 'true');
}

export function writeCorsPreflight(raw: ServerResponse, origin?: string): void {
  applyCorsHeaders(raw, origin);
  raw.writeHead(204);
  raw.end();
}

export function sendSseEvent(
  raw: ServerResponse,
  event: string,
  data: unknown,
): void {
  raw.write(`event: ${event}\n`);
  raw.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createSseStream(
  raw: ServerResponse,
  onClose: (client: SseClient) => void,
  origin?: string,
): SseClient {
  applyCorsHeaders(raw, origin);
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const client: SseClient = {
    write: (chunk) => raw.write(chunk),
    close: () => raw.end(),
  };

  raw.on('close', () => onClose(client));
  return client;
}

export function addBrowserClient(client: SseClient): void {
  browserClients.add(client);
  client.write('event: connected\n');
  client.write('data: {"ok":true}\n\n');

  while (pendingBrowserJobs.length > 0) {
    const job = pendingBrowserJobs.shift();
    if (!job) {
      break;
    }
    client.write(`event: job\ndata: ${JSON.stringify(job)}\n\n`);
  }
}

export function removeBrowserClient(client: SseClient): void {
  browserClients.delete(client);
}

export function broadcastBrowserJob(job: BrowserJobEvent): void {
  const payload = `event: job\ndata: ${JSON.stringify(job)}\n\n`;

  if (browserClients.size === 0) {
    pendingBrowserJobs.push(job);
    return;
  }

  for (const client of browserClients) {
    client.write(payload);
  }
}

export function addSessionClient(sessionId: string, client: SseClient): void {
  const clients = sessionClients.get(sessionId) ?? new Set();
  clients.add(client);
  sessionClients.set(sessionId, clients);
}

export function removeSessionClient(sessionId: string, client: SseClient): void {
  const clients = sessionClients.get(sessionId);
  if (!clients) {
    return;
  }

  clients.delete(client);
  if (clients.size === 0) {
    sessionClients.delete(sessionId);
  }
}

export function notifySessionComplete(
  sessionId: string,
  payload: { response: string },
): void {
  notifySession(sessionId, 'complete', payload);
}

export function notifySessionError(
  sessionId: string,
  payload: { error: string },
): void {
  notifySession(sessionId, 'error', payload);
}

export function notifySessionChunk(
  sessionId: string,
  payload: { text: string },
): void {
  const clients = sessionClients.get(sessionId);
  if (!clients) {
    return;
  }

  const message = `event: chunk\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

function notifySession(
  sessionId: string,
  event: string,
  data: unknown,
): void {
  const clients = sessionClients.get(sessionId);
  if (!clients) {
    return;
  }

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
    client.close();
  }

  sessionClients.delete(sessionId);
}

export function startSessionHeartbeat(
  _sessionId: string,
  client: SseClient,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    client.write(': heartbeat\n\n');
  }, 15_000);
}

export function clearSseHub(): void {
  browserClients.clear();
  sessionClients.clear();
  pendingBrowserJobs.length = 0;
}
