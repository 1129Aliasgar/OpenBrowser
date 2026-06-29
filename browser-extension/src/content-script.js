const BRIDGE_URL = 'http://127.0.0.1:5000';

const SUPPORTED_HOSTS = new Set([
  'chatgpt.com',
  'chat.openai.com',
  'gemini.google.com',
  'chat.deepseek.com',
]);

const RESPONSE_TIMEOUT_MS = 120_000;
const STABLE_MS = 2_000;
const POLL_MS = 500;
const SEND_RETRY_MS = 250;
const SEND_MAX_RETRIES = 20;

let running = false;
let eventSource = null;
const processedSessionIds = new Set();

if (SUPPORTED_HOSTS.has(location.hostname)) {
  connectBrowserEvents();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OPENBROWSER_RUN_JOB') {
    return false;
  }

  handleJob(message.job)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});

function connectBrowserEvents() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`${BRIDGE_URL}/browser/events`);

  eventSource.addEventListener('job', (event) => {
    try {
      const job = JSON.parse(event.data);
      void handleIncomingJob(job);
    } catch (error) {
      console.error('[openbrowser] Failed to parse SSE job', error);
    }
  });

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    setTimeout(connectBrowserEvents, 3000);
  };
}

async function handleIncomingJob(job) {
  if (running || !job?.sessionId || processedSessionIds.has(job.sessionId)) {
    return;
  }

  running = true;
  try {
    const claim = await claimJob(job.sessionId);
    if (!claim.claimed || !claim.job) {
      return;
    }

    processedSessionIds.add(job.sessionId);
    await processJob(claim.job);
  } catch (error) {
    await postBrowserResponse({
      sessionId: job.sessionId,
      error: String(error),
    });
  } finally {
    running = false;
  }
}

async function handleJob(job) {
  const claim = await claimJob(job.sessionId);
  if (!claim.claimed || !claim.job) {
    throw new Error('Job already claimed by another tab');
  }

  await processJob(claim.job);
}

async function claimJob(sessionId) {
  const response = await fetch(`${BRIDGE_URL}/browser/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to claim job (${response.status})`);
  }

  return response.json();
}

async function processJob(job) {
  const beforeCount = countAssistantMessages();

  await injectPrompt(job.message);
  await clickSendWhenReady();

  const text =
    job.mode === 'agent'
      ? await waitForAgentJson(beforeCount)
      : await waitForPlainResponse(beforeCount);

  await postBrowserResponse({ sessionId: job.sessionId, text });
}

async function injectPrompt(message) {
  const input = findPromptInput();
  if (!input) {
    throw new Error('Chat input not found. Reload the ChatGPT tab and try again.');
  }

  input.focus();
  await sleep(100);

  if (input instanceof HTMLTextAreaElement) {
    setNativeValue(input, '');
    setNativeValue(input, message);
    return;
  }

  if (input.isContentEditable) {
    await injectProseMirror(input, message);
    return;
  }

  throw new Error('Unsupported chat input element.');
}

async function injectProseMirror(element, text) {
  element.focus();
  clearComposer(element);
  await sleep(50);

  document.execCommand('insertText', false, text);
  await sleep(100);

  if (hasInjectedContent(element, text)) {
    dispatchInput(element);
    return;
  }

  clearComposer(element);
  dispatchPaste(element, text);
  await sleep(150);

  if (!hasInjectedContent(element, text)) {
    element.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  dispatchInput(element);
}

function clearComposer(element) {
  element.focus();
  selectAll(element);
  document.execCommand('delete', false);
}

function hasInjectedContent(element, text) {
  const actual = (element.textContent ?? '').trim();
  const expected = text.trim();
  if (!actual || !expected) {
    return false;
  }

  return actual.length >= expected.length * 0.85;
}

function dispatchPaste(element, text) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      }),
    );
  } catch {
    // Fall back to innerHTML in injectProseMirror.
  }
}

function selectAll(element) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function dispatchInput(element) {
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function clickSendWhenReady() {
  for (let attempt = 0; attempt < SEND_MAX_RETRIES; attempt += 1) {
    const button = findSendButton();
    if (button && !button.disabled) {
      button.click();
      return;
    }
    await sleep(SEND_RETRY_MS);
  }

  throw new Error('Send button stayed disabled. ChatGPT did not accept the injected prompt.');
}

function findSendButton() {
  return (
    document.querySelector('#composer-submit-button') ??
    document.querySelector('button[data-testid="send-button"]') ??
    document.querySelector('button[aria-label="Send prompt"]') ??
    document.querySelector('button.composer-submit-button-color')
  );
}

async function waitForPlainResponse(beforeCount) {
  const text = await waitForAssistantText(beforeCount);
  if (!text) {
    throw new Error('No assistant response detected.');
  }
  return text;
}

async function waitForAgentJson(beforeCount) {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  let lastCandidate = '';

  while (Date.now() < deadline) {
    const text = getLatestAssistantText(beforeCount);
    if (text) {
      const payload = extractJsonPayload(text);
      if (payload) {
        return payload;
      }
      lastCandidate = text;
    }
    await sleep(POLL_MS);
  }

  if (lastCandidate) {
    const payload = extractJsonPayload(lastCandidate);
    if (payload) {
      return payload;
    }
  }

  throw new Error('Timed out waiting for valid agent JSON response.');
}

async function waitForAssistantText(beforeCount) {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  let lastText = '';
  let stableSince = 0;

  while (Date.now() < deadline) {
    const text = getLatestAssistantText(beforeCount);
    if (text) {
      if (text === lastText) {
        if (Date.now() - stableSince >= STABLE_MS) {
          return text;
        }
      } else {
        lastText = text;
        stableSince = Date.now();
      }
    }
    await sleep(POLL_MS);
  }

  return lastText || null;
}

function getLatestAssistantText(beforeCount) {
  const responseNodes = collectAssistantNodes();
  if (responseNodes.length <= beforeCount) {
    return null;
  }

  const latest = responseNodes[responseNodes.length - 1];
  return latest?.textContent?.trim() ?? null;
}

function collectAssistantNodes() {
  const selectors = [
    '[data-message-author-role="assistant"]',
    '.markdown-new-styling',
    '.markdown.prose',
    'article[data-turn="assistant"]',
  ];

  for (const selector of selectors) {
    const nodes = [...document.querySelectorAll(selector)];
    if (nodes.length > 0) {
      return nodes;
    }
  }

  return [];
}

function countAssistantMessages() {
  return collectAssistantNodes().length;
}

function findPromptInput() {
  return (
    document.querySelector('#prompt-textarea') ??
    document.querySelector('div.ProseMirror#prompt-textarea[contenteditable="true"]') ??
    document.querySelector('div.ProseMirror[contenteditable="true"]') ??
    document.querySelector('textarea[placeholder*="Message"]') ??
    document.querySelector('textarea[data-id="root"]')
  );
}

function extractJsonPayload(text) {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    if (!parsed.conversationId) {
      return null;
    }
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

async function postBrowserResponse(body) {
  const response = await fetch(`${BRIDGE_URL}/browser/response`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to post browser response (${response.status})`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
