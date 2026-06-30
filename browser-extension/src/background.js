const BRIDGE_URL = 'http://127.0.0.1:5000';
const RECONNECT_MS = 2500;
const DISPATCH_RETRY_MS = 1500;
const MAX_DISPATCH_ATTEMPTS = 12;
const KEEPALIVE_ALARM = 'openbrowser-keepalive';

const AI_URL_PATTERNS = [
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://gemini.google.com/*',
  'https://chat.deepseek.com/*',
  'https://claude.ai/*',
  'https://www.perplexity.ai/*',
  'https://perplexity.ai/*',
  'https://chat.z.ai/*',
  'https://glm.ai/*',
  'https://open.bigmodel.cn/*',
  'https://grok.com/*',
  'https://x.com/*',
];

let streamAbort = null;
let sseConnected = false;
let connecting = false;
let reconnectTimer = null;

/** @type {Map<number, { host: string, lastSeen: number }>} */
const readyTabs = new Map();

/** @type {Array<{ job: object, attempts: number, nextTry: number }>} */
const pendingDispatches = [];

/** @type {Set<string>} */
const dispatchedSessionIds = new Set();

chrome.runtime.onInstalled.addListener(() => {
  setupKeepalive();
  void connectBridgeStream();
});

chrome.runtime.onStartup.addListener(() => {
  setupKeepalive();
  void connectBridgeStream();
});

setupKeepalive();
void connectBridgeStream();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== KEEPALIVE_ALARM) {
    return;
  }

  if (!sseConnected) {
    void connectBridgeStream();
  }

  void flushPendingDispatches();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPENBROWSER_REGISTER') {
    registerTab(sender.tab);
    void flushPendingDispatches();
    sendResponse({ ok: true, sseConnected, readyTabs: readyTabs.size });
    return false;
  }

  if (message?.type === 'OPENBROWSER_PING') {
    if (!sseConnected) {
      void connectBridgeStream();
    }
    sendResponse({ ok: true, sseConnected, readyTabs: readyTabs.size });
    return false;
  }

  if (message?.type === 'BRIDGE_REQUEST') {
    bridgeRequest(message.path, message.init ?? {})
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});

function setupKeepalive() {
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 1 });
}

function registerTab(tab) {
  if (!tab?.id || !tab.url) {
    return;
  }

  let host = '';
  try {
    host = new URL(tab.url).hostname;
  } catch {
    return;
  }

  readyTabs.set(tab.id, { host, lastSeen: Date.now() });
}

async function bridgeRequest(path, init) {
  const headers = {
    ...(init.headers ?? {}),
  };

  if (init.body && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bridge ${response.status}${text ? `: ${text}` : ''}`);
  }

  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectBridgeStream();
  }, RECONNECT_MS);
}

async function connectBridgeStream() {
  if (connecting || sseConnected) {
    return;
  }

  connecting = true;
  streamAbort?.abort();
  streamAbort = new AbortController();

  try {
    const response = await fetch(`${BRIDGE_URL}/browser/events`, {
      signal: streamAbort.signal,
      headers: { Accept: 'text/event-stream' },
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE failed (${response.status})`);
    }

    sseConnected = true;
    console.info('[openbrowser] Bridge SSE connected');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = consumeSse(buffer, (event, data) => {
        if (event === 'job') {
          void dispatchJob(data);
        }
      });
    }

    throw new Error('SSE stream ended');
  } catch (error) {
    sseConnected = false;

    if (streamAbort?.signal.aborted) {
      return;
    }

    console.warn('[openbrowser] Bridge SSE disconnected, retrying...', error);
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

function consumeSse(buffer, onEvent) {
  const chunks = buffer.split('\n\n');
  const remainder = chunks.pop() ?? '';

  for (const chunk of chunks) {
    if (!chunk.trim() || chunk.startsWith(':')) {
      continue;
    }

    let event = 'message';
    let dataLine = '';

    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLine = line.slice(5).trim();
      }
    }

    if (!dataLine) {
      continue;
    }

    try {
      onEvent(event, JSON.parse(dataLine));
    } catch {
      // Ignore malformed SSE payloads.
    }
  }

  return remainder;
}

async function dispatchJob(job) {
  if (!job?.sessionId) {
    return;
  }

  if (dispatchedSessionIds.has(job.sessionId)) {
    return;
  }

  const delivered = await tryDispatchJob(job);
  if (delivered) {
    dispatchedSessionIds.add(job.sessionId);
    return;
  }

  queuePendingDispatch(job);
}

function queuePendingDispatch(job) {
  const exists = pendingDispatches.some((entry) => entry.job.sessionId === job.sessionId);
  if (exists) {
    return;
  }

  pendingDispatches.push({
    job,
    attempts: 0,
    nextTry: Date.now() + DISPATCH_RETRY_MS,
  });
}

async function flushPendingDispatches() {
  const now = Date.now();

  for (let index = pendingDispatches.length - 1; index >= 0; index -= 1) {
    const entry = pendingDispatches[index];
    if (entry.nextTry > now) {
      continue;
    }

    const delivered = await tryDispatchJob(entry.job);
    if (delivered) {
      dispatchedSessionIds.add(entry.job.sessionId);
      pendingDispatches.splice(index, 1);
      continue;
    }

    entry.attempts += 1;
    entry.nextTry = now + DISPATCH_RETRY_MS;

    if (entry.attempts >= MAX_DISPATCH_ATTEMPTS) {
      console.warn('[openbrowser] Gave up dispatching job', entry.job.sessionId);
      pendingDispatches.splice(index, 1);
    }
  }
}

async function tryDispatchJob(job) {
  const tabs = await getCandidateTabs();

  for (const tab of tabs) {
    if (!tab.id) {
      continue;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'OPENBROWSER_JOB',
        job,
      });

      if (response?.ok !== false) {
        return true;
      }
    } catch {
      readyTabs.delete(tab.id);
    }
  }

  return false;
}

async function getCandidateTabs() {
  const [aiTabs, activeTabs] = await Promise.all([
    chrome.tabs.query({ url: AI_URL_PATTERNS }),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);

  const active = activeTabs[0];
  const activeAi = active?.id && aiTabs.some((tab) => tab.id === active.id) ? active : null;

  const registered = aiTabs
    .filter((tab) => tab.id && readyTabs.has(tab.id))
    .sort((left, right) => {
      const leftSeen = readyTabs.get(left.id)?.lastSeen ?? 0;
      const rightSeen = readyTabs.get(right.id)?.lastSeen ?? 0;
      return rightSeen - leftSeen;
    });

  const ordered = [];
  const seen = new Set();

  const push = (tab) => {
    if (!tab?.id || seen.has(tab.id)) {
      return;
    }
    seen.add(tab.id);
    ordered.push(tab);
  };

  push(activeAi);
  for (const tab of registered) {
    push(tab);
  }
  for (const tab of aiTabs) {
    push(tab);
  }

  return ordered;
}
