const BRIDGE_URL = 'http://127.0.0.1:5000';

const RESPONSE_TIMEOUT_MS = 180_000;
const STABLE_MS = 2_000;
const ASK_STABLE_MS = 3_000;
const POLL_MS = 400;
const CHUNK_MIN_CHARS = 24;
const CHUNK_MIN_MS = 250;
const SEND_RETRY_MS = 250;
const SEND_MAX_RETRIES = 20;
const FINISH_RECHECK_MS = 600;

let running = false;
let eventSource = null;
const processedSessionIds = new Set();

const provider = getProviderForHost(location.hostname);
if (provider) {
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

  const text = await waitForPlainResponse(beforeCount, job.mode, job.sessionId);
  if (job.mode === 'ask' && job.sessionId) {
    await postBrowserChunk({ sessionId: job.sessionId, text });
  }

  await postBrowserResponse({ sessionId: job.sessionId, text });
}

async function injectPrompt(message) {
  const input = findPromptInput();
  if (!input) {
    throw new Error('Chat input not found. Reload the AI chat tab and try again.');
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

  throw new Error('Send button stayed disabled. The page did not accept the injected prompt.');
}

function findSendButton() {
  if (!provider) {
    return null;
  }
  return queryFirst(provider.selectors.send);
}

async function waitForPlainResponse(beforeCount, mode, sessionId) {
  const text = await waitForAssistantText(beforeCount, mode, sessionId);
  if (!text) {
    throw new Error('No assistant response detected.');
  }
  return text;
}

async function waitForAssistantText(beforeCount, mode, sessionId) {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  let lastText = '';
  let stableSince = 0;
  let lastChunkText = '';
  let lastChunkAt = 0;

  while (Date.now() < deadline) {
    const text = getLatestAssistantText(beforeCount, mode === 'agent');
    if (text) {
      if (mode === 'ask' && sessionId && shouldPostChunk(text, lastChunkText, lastChunkAt)) {
        await postBrowserChunk({ sessionId, text });
        lastChunkText = text;
        lastChunkAt = Date.now();
      }

      const stableMs = getStableMs(text, mode);
      if (text === lastText) {
        if (Date.now() - stableSince >= stableMs && canFinishResponse()) {
          await sleep(FINISH_RECHECK_MS);
          const recheck = getLatestAssistantText(beforeCount, mode === 'agent');
          if (recheck && recheck.length >= text.length && canFinishResponse()) {
            if (mode === 'ask' && sessionId && recheck !== lastChunkText) {
              await postBrowserChunk({ sessionId, text: recheck });
            }
            return recheck;
          }
          if (recheck && recheck !== text) {
            lastText = recheck;
            stableSince = Date.now();
          }
        }
      } else {
        lastText = text;
        stableSince = Date.now();
      }
    }
    await sleep(POLL_MS);
  }

  const finalText = getLatestAssistantText(beforeCount, mode === 'agent');
  if (finalText && canFinishResponse()) {
    return finalText;
  }

  return finalText || lastText || null;
}

function shouldPostChunk(text, lastChunkText, lastChunkAt) {
  if (text === lastChunkText) {
    return false;
  }

  if (text.length - lastChunkText.length >= CHUNK_MIN_CHARS) {
    return true;
  }

  return Date.now() - lastChunkAt >= CHUNK_MIN_MS;
}

function canFinishResponse() {
  return !isStillGenerating();
}

function isStillGenerating() {
  if (!provider) {
    return false;
  }

  if (queryFirst(provider.selectors.stop)) {
    return true;
  }

  const streamingNode = document.querySelector('[data-is-streaming="true"], [data-is-streaming=""]');
  if (streamingNode) {
    return true;
  }

  return false;
}

function getStableMs(text, mode) {
  if (mode !== 'agent') {
    return ASK_STABLE_MS;
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}') && braceDepth(trimmed) === 0) {
    return 800;
  }

  return STABLE_MS;
}

function braceDepth(text) {
  let depth = 0;
  for (const char of text) {
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
  }
  return depth;
}

function getLatestAssistantText(beforeCount, preferCodeBlock = false) {
  const responseNodes = collectAssistantNodes();
  if (responseNodes.length <= beforeCount) {
    return null;
  }

  const latest = responseNodes[responseNodes.length - 1];
  latest.scrollIntoView({ block: 'end', behavior: 'instant' });

  if (preferCodeBlock) {
    const codeBlocks = [
      ...latest.querySelectorAll('pre code'),
      ...latest.querySelectorAll('code.language-json'),
      ...latest.querySelectorAll('code'),
    ];

    for (const block of codeBlocks) {
      const content = block.textContent?.trim();
      if (content?.startsWith('{')) {
        return content;
      }
    }
  }

  return extractMessageText(latest);
}

function extractMessageText(node) {
  if (!provider) {
    return node.textContent?.trim() ?? null;
  }

  for (const selector of provider.selectors.markdown) {
    const markdown = node.querySelector(selector);
    if (markdown) {
      const text = (markdown.innerText ?? markdown.textContent ?? '').trim();
      if (text) {
        return text;
      }
    }
  }

  const text = (node.innerText ?? node.textContent ?? '').trim();
  return text || null;
}

function collectAssistantNodes() {
  if (!provider) {
    return [];
  }
  return queryAll(provider.selectors.assistant);
}

function countAssistantMessages() {
  return collectAssistantNodes().length;
}

function findPromptInput() {
  if (!provider) {
    return null;
  }
  return queryFirst(provider.selectors.input);
}

async function postBrowserChunk(body) {
  try {
    await fetch(`${BRIDGE_URL}/browser/chunk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Chunk delivery is best-effort.
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
