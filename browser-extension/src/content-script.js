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
const processedSessionIds = new Set();
const jobQueue = [];

const provider = getProviderForHost(location.hostname);

void registerWithBackground();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void registerWithBackground();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPENBROWSER_JOB') {
    void handleIncomingJob(message.job)
      .then(() => sendResponse?.({ ok: true }))
      .catch((error) => sendResponse?.({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type !== 'OPENBROWSER_RUN_JOB') {
    return false;
  }

  handleJob(message.job)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});

async function handleIncomingJob(job) {
  if (!job?.sessionId || processedSessionIds.has(job.sessionId)) {
    return;
  }

  if (running) {
    jobQueue.push(job);
    return;
  }

  await runJob(job);
  await drainJobQueue();
}

async function drainJobQueue() {
  while (!running && jobQueue.length > 0) {
    const next = jobQueue.shift();
    if (!next || processedSessionIds.has(next.sessionId)) {
      continue;
    }
    await runJob(next);
  }
}

async function runJob(job) {
  if (!provider) {
    return;
  }

  running = true;
  try {
    let claim = await claimJob(job.sessionId);

    if (!claim.claimed || !claim.job) {
      await sleep(800);
      claim = await claimJob(job.sessionId);
    }

    if (!claim.claimed || !claim.job) {
      throw new Error('Could not claim OpenBrowser job. Reload this AI tab and try again.');
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

async function registerWithBackground() {
  if (!provider) {
    return;
  }

  try {
    await sendRuntimeMessage({ type: 'OPENBROWSER_REGISTER' });
  } catch {
    setTimeout(registerWithBackground, 2000);
  }
}

async function sendRuntimeMessage(message) {
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      lastError = error;
      await sleep(250 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Extension background is not available');
}

async function bridgeRequest(path, init = {}) {
  const result = await sendRuntimeMessage({
    type: 'BRIDGE_REQUEST',
    path,
    init,
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? 'Bridge request failed');
  }

  return result.data;
}

async function claimJob(sessionId) {
  return bridgeRequest('/browser/claim', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
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

  const method = provider?.inject ?? (input instanceof HTMLTextAreaElement ? 'textarea' : 'prose-mirror');

  if (method === 'textarea' || input instanceof HTMLTextAreaElement) {
    await injectTextarea(input, message);
    return;
  }

  if (method === 'lexical' || input.getAttribute('data-lexical-editor') === 'true') {
    await injectLexical(input, message);
    return;
  }

  if (input.isContentEditable) {
    await injectProseMirror(input, message);
    return;
  }

  throw new Error('Unsupported chat input element.');
}

async function injectTextarea(element, text) {
  element.focus();
  element.select?.();

  const prototype = window.HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, text);

  element.value = text;
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  if (!hasInjectedContent(element, text)) {
    dispatchPaste(element, text);
    await sleep(100);
  }
}

async function injectLexical(element, text) {
  element.focus();
  clearComposer(element);
  await sleep(50);

  dispatchPaste(element, text);
  await sleep(100);

  if (!hasInjectedContent(element, text)) {
    document.execCommand('insertText', false, text);
    await sleep(100);
  }

  if (!hasInjectedContent(element, text)) {
    element.innerHTML = `<p dir="auto">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  dispatchInput(element);
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

  if (agentResponseNeedsMoreContent(text)) {
    return STABLE_MS * 3;
  }

  return STABLE_MS;
}

function agentResponseNeedsMoreContent(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }

  try {
    const parsed = JSON.parse(extractJsonObject(trimmed));
    const operations = parsed?.operations;
    if (!Array.isArray(operations)) {
      return false;
    }

    const fileOps = operations.filter(
      (operation) =>
        operation?.action === 'CREATE_FILE' || operation?.action === 'EDIT_FILE',
    );
    if (fileOps.length === 0) {
      return false;
    }

    const blocks = extractDomFileBlocksFromText(text);
    for (const operation of fileOps) {
      const path = normalizeCapturePath(operation.path ?? '');
      if (!path) {
        continue;
      }

      const hasBlock =
        blocks.some((block) => block.path === path) ||
        new RegExp(`\`\`\`file:${escapeRegex(path)}`, 'i').test(text) ||
        new RegExp(`\`\`\`${escapeRegex(path)}`, 'i').test(text);

      if (!hasBlock) {
        return true;
      }
    }
  } catch {
    // Keep waiting while JSON is still streaming.
    if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
      return true;
    }
  }

  return false;
}

function extractJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) {
    return text;
  }

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return text.slice(start);
}

function getLatestAssistantText(beforeCount, agentMode = false) {
  const responseNodes = collectAssistantNodes();
  if (responseNodes.length <= beforeCount) {
    return null;
  }

  const latest = responseNodes[responseNodes.length - 1];
  latest.scrollIntoView({ block: 'end', behavior: 'instant' });

  if (!agentMode) {
    return extractMessageText(latest);
  }

  return buildAgentCaptureText(latest);
}

function buildAgentCaptureText(node) {
  const parts = [];
  const messageText = extractMessageText(node);
  if (messageText) {
    parts.push(messageText);
  }

  const domBlocks = extractDomFileBlocks(node);
  for (const block of domBlocks) {
    const fence = `\`\`\`file:${block.path}\n${block.content}\n\`\`\``;
    if (!parts.join('\n').includes(fence)) {
      parts.push(fence);
    }
  }

  return parts.join('\n\n').trim() || null;
}

function extractDomFileBlocks(node) {
  const blocks = new Map();
  const pres = node.querySelectorAll('pre');

  for (const pre of pres) {
    const code = pre.querySelector('code') ?? pre;
    const content = (code.textContent ?? '').trim();
    if (!content || looksLikeOperationsJson(content)) {
      continue;
    }

    const path = findPathForPre(pre);
    if (!path) {
      continue;
    }

    blocks.set(path, content);
  }

  return [...blocks.entries()].map(([path, content]) => ({ path, content }));
}

function extractDomFileBlocksFromText(text) {
  const blocks = [];
  const pattern = /```file:([^\n`]+)\n([\s\S]*?)```/gi;
  for (const match of text.matchAll(pattern)) {
    const path = normalizeCapturePath(match[1] ?? '');
    const content = (match[2] ?? '').trim();
    if (path && content) {
      blocks.push({ path, content });
    }
  }
  return blocks;
}

function findPathForPre(pre) {
  let sibling = pre.previousElementSibling;
  for (let step = 0; step < 4 && sibling; step += 1) {
    const path = extractPathFromLabel(sibling.textContent ?? '');
    if (path) {
      return path;
    }
    sibling = sibling.previousElementSibling;
  }

  const container = pre.closest('[data-message-author-role="assistant"], article, div');
  if (container) {
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, span, button');
    for (const header of headers) {
      if (header.contains(pre)) {
        continue;
      }
      const path = extractPathFromLabel(header.textContent ?? '');
      if (path) {
        return path;
      }
    }
  }

  const code = pre.querySelector('code');
  const className = code?.className ?? '';
  const langMatch = /language-([^\s]+)/.exec(className);
  if (langMatch?.[1]?.includes('.')) {
    return normalizeCapturePath(langMatch[1]);
  }

  return null;
}

function extractPathFromLabel(text) {
  const match = /([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)/.exec(text.trim());
  return match ? normalizeCapturePath(match[1]) : null;
}

function normalizeCapturePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function looksLikeOperationsJson(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed?.operations);
  } catch {
    return trimmed.includes('"operations"');
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMessageText(node) {
  if (!provider) {
    return node.textContent?.trim() ?? null;
  }

  const clone = node.cloneNode(true);
  for (const selector of provider.selectors.exclude ?? []) {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  }

  for (const selector of provider.selectors.markdown) {
    const markdown = clone.querySelector(selector);
    if (markdown) {
      const text = (markdown.innerText ?? markdown.textContent ?? '').trim();
      if (text) {
        return text;
      }
    }
  }

  const text = (clone.innerText ?? clone.textContent ?? '').trim();
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

async function handleJob(job) {
  const claim = await claimJob(job.sessionId);
  if (!claim.claimed || !claim.job) {
    throw new Error('Job already claimed by another tab');
  }

  await processJob(claim.job);
}

async function postBrowserChunk(body) {
  try {
    await bridgeRequest('/browser/chunk', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    // Chunk delivery is best-effort.
  }
}

async function postBrowserResponse(body) {
  await bridgeRequest('/browser/response', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
