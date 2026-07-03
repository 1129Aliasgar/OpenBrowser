const RESPONSE_TIMEOUT_MS = 180_000;
const STABLE_MS = 2_000;
const ASK_STABLE_MS = 3_000;
const ASK_DRAFT_STABLE_MS = 5_000;
const POLL_MS = 400;
const CHUNK_MIN_CHARS = 24;
const CHUNK_MIN_MS = 250;
const SEND_RETRY_MS = 250;
const SEND_MAX_RETRIES = 20;
const FILE_UPLOAD_SEND_WAIT_MS = 5_000;
const FILE_UPLOAD_SEND_RETRY_WAIT_MS = 8_000;
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

  if (message?.type === 'OPENBROWSER_RUN_JOB') {
    void handleIncomingJob(message.job)
      .then(() => sendResponse?.({ ok: true }))
      .catch((error) => sendResponse?.({ ok: false, error: String(error) }));
    return true;
  }

  return false;
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
  const threadIsEmpty = beforeCount === 0;

  if (job.delivery === 'file') {
    const composerMessage = job.composerMessage ?? job.message;
    const attached = await attachPromptFile(job);
    if (!attached) {
      const filePayload = await bridgeRequest(`/browser/prompt-file/${job.sessionId}`);
      const fullMessage = String(filePayload?.content ?? '');
      if (!fullMessage) {
        throw new Error('Prompt file from bridge server was empty.');
      }
      await injectPrompt(fullMessage);
      await sleep(150);
      await clickSendWhenReady();
    } else {
      await clickSendAfterFileAttach(
        job.promptFileName ?? 'openbrowser-prompt.txt',
        composerMessage,
      );
    }
  } else {
    const outboundMessage = buildOutboundMessageForThread(job, threadIsEmpty);
    await injectPrompt(outboundMessage);
    await sleep(150);
    await clickSendWhenReady();
  }

  const text = await waitForPlainResponse(beforeCount, job.mode, job.sessionId, {
    markdownDraft: job.markdownDraft,
  });
  if (job.mode === 'ask' && job.sessionId) {
    await postBrowserChunk({ sessionId: job.sessionId, text });
  }

  await postBrowserResponse({ sessionId: job.sessionId, text });
}

function buildOutboundMessageForThread(job, threadIsEmpty) {
  const message = String(job?.message ?? '');
  if (!threadIsEmpty || !job?.systemPrompt) {
    return message;
  }

  if (message.includes('--- OpenBrowser System Instructions ---')) {
    return message;
  }

  return [
    '--- OpenBrowser System Instructions ---',
    String(job.systemPrompt),
    '--- End System Instructions ---',
    '',
    message,
  ].join('\n');
}

const MAX_ATTACH_ATTEMPTS = 2;
const ATTACH_PREVIEW_POLL_MS = 300;
const ATTACH_PREVIEW_TIMEOUT_MS = 2_500;
const ATTACH_SHADOW_MAX_DEPTH = 4;

let attachShadowRoots = null;

function clearAttachDomCache() {
  attachShadowRoots = null;
}

function getAttachShadowRoots() {
  if (attachShadowRoots) {
    return attachShadowRoots;
  }

  const roots = [];
  const queue = [{ root: document, depth: 0 }];

  while (queue.length > 0) {
    const { root, depth } = queue.shift();
    if (depth >= ATTACH_SHADOW_MAX_DEPTH) {
      continue;
    }

    const elements = root.querySelectorAll?.('*') ?? [];
    for (const element of elements) {
      if (!element.shadowRoot) {
        continue;
      }

      roots.push(element.shadowRoot);
      queue.push({ root: element.shadowRoot, depth: depth + 1 });
    }
  }

  attachShadowRoots = roots;
  return roots;
}

function queryFirstForAttach(selectors, root = document) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of selectorList) {
    const node = root.querySelector?.(selector);
    if (node) {
      return node;
    }
  }

  for (const shadowRoot of getAttachShadowRoots()) {
    for (const selector of selectorList) {
      const node = shadowRoot.querySelector?.(selector);
      if (node) {
        return node;
      }
    }
  }

  return null;
}

function isPromptAlreadyAttached(fileName) {
  return hasUploadUiSignal(fileName);
}

async function attachPromptFile(job) {
  clearAttachDomCache();

  const fileName = job.promptFileName ?? 'openbrowser-prompt.txt';
  const filePayload = await bridgeRequest(`/browser/prompt-file/${job.sessionId}`);
  const content = String(filePayload?.content ?? '');

  if (!content) {
    throw new Error('Prompt file from bridge server was empty.');
  }

  if (isPromptAlreadyAttached(fileName)) {
    return true;
  }

  const file = new File([content], fileName, { type: 'text/plain' });
  const fileSelectors = provider?.selectors?.fileInput ?? ['input[type="file"]'];

  if (await tryAttachOnBestInput(file, fileName, fileSelectors)) {
    return true;
  }

  for (let attempt = 1; attempt < MAX_ATTACH_ATTEMPTS; attempt += 1) {
    if (isPromptAlreadyAttached(fileName)) {
      return true;
    }

    await openUploadMenuForProvider(fileName);
    await sleep(700);

    if (await tryAttachOnBestInput(file, fileName, fileSelectors)) {
      return true;
    }
  }

  return waitForAttachComplete(fileName);
}

async function tryAttachOnBestInput(file, fileName, fileSelectors) {
  if (isPromptAlreadyAttached(fileName)) {
    return true;
  }

  const fileInput = findBestFileInput(fileSelectors);
  if (!fileInput) {
    return false;
  }

  return trySetFileAndConfirm(fileInput, file, fileName);
}

function findBestFileInput(selectors) {
  for (const selector of selectors) {
    const node = queryFirstForAttach(selector);
    if (node instanceof HTMLInputElement && node.type === 'file' && !node.disabled) {
      return node;
    }
  }

  return null;
}

async function openUploadMenuForProvider(fileName) {
  if (isPromptAlreadyAttached(fileName)) {
    return;
  }

  const host = location.hostname;

  if (host.includes('chatgpt.com') || host.includes('openai.com')) {
    clickElement(
      queryFirstForAttach([
        'button[data-testid="composer-plus-btn"]',
        'button[aria-label="Add files and more"]',
        'button.composer-btn[data-testid="composer-plus-btn"]',
      ]),
    );
    await sleep(500);
    clickElement(
      findClickableByText([
        'add photos & files',
        'add photos and files',
        'upload file',
        'attach file',
        'add files',
      ]),
    );
    return;
  }

  if (host.includes('gemini.google.com')) {
    const existingInput = findBestFileInput([
      'images-files-uploader input[type="file"]',
      ...(provider?.selectors?.fileInput ?? ['input[type="file"]']),
    ]);
    if (existingInput) {
      return;
    }

    clickElement(
      queryFirstForAttach([
        'button[aria-label="Open upload file menu"]',
        'button.upload-card-button',
        'button[aria-label*="Upload" i]',
        'button[aria-label*="Attach" i]',
        '.leading-actions-wrapper button',
      ]),
    );
    await sleep(500);

    if (isPromptAlreadyAttached(fileName)) {
      return;
    }

    clickElement(
      queryFirstForAttach(provider?.selectors?.attachMenuSelectors ?? []) ??
        findClickableByText(['files', 'upload file', 'add file']),
    );
    return;
  }

  if (host.includes('deepseek.com')) {
    clickElement(
      queryFirstForAttach([
        'div.ds-button.ds-button--iconLabelPrimary.ds-button--icon.ds-button--capsule[role="button"]',
        'div.ds-button.ds-button--icon.ds-button--capsule.ds-button--s[role="button"]',
        'input[type="file"] + div[role="button"]',
      ]),
    );
    return;
  }

  if (host.includes('perplexity.ai')) {
    clickElement(queryFirstForAttach(provider?.selectors?.attachButton ?? []));
    await sleep(500);

    if (isPromptAlreadyAttached(fileName)) {
      return;
    }

    clickElement(
      findClickableByText([
        'upload files or images',
        'upload files',
        'upload file',
        'attach file',
      ]),
    );
    return;
  }

  clickElement(queryFirstForAttach(provider?.selectors?.attachButton ?? []));
  await sleep(500);

  if (isPromptAlreadyAttached(fileName)) {
    return;
  }

  clickElement(findClickableByText(provider?.selectors?.attachMenuText ?? ['upload', 'file']));
}

async function trySetFileAndConfirm(fileInput, file, fileName) {
  if (isPromptAlreadyAttached(fileName)) {
    return true;
  }

  if (!(await setFileOnInput(fileInput, file))) {
    return false;
  }

  const deadline = Date.now() + ATTACH_PREVIEW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (isPromptAlreadyAttached(fileName)) {
      return true;
    }

    if (fileInput.files?.length > 0) {
      return true;
    }

    await sleep(ATTACH_PREVIEW_POLL_MS);
  }

  return isPromptAlreadyAttached(fileName);
}

function hasUploadUiSignal(fileName) {
  if (hasAttachmentPreview(fileName)) {
    return true;
  }

  const composerRoot =
    findPromptInput()?.closest(
      'form, [class*="composer"], [class*="input-area"], [class*="chat-input"], uploader-file-preview',
    ) ?? null;

  if (!composerRoot) {
    return false;
  }

  const text = (composerRoot.textContent ?? '').toLowerCase();
  const baseName = fileName.replace(/\.[^.]+$/, '').toLowerCase();

  return (
    text.includes('openbrowser-prompt') ||
    text.includes(baseName) ||
    text.includes('.txt')
  );
}

async function setFileOnInput(fileInput, file) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste',
        dataTransfer,
      }),
    );
    await sleep(400);
    return fileInput.files?.length > 0;
  } catch {
    return false;
  }
}

function hasAttachmentPreview(fileName) {
  const previewSelectors = provider?.selectors?.attachmentPreview ?? [
    'gem-attachment',
    'uploader-file-preview',
    '.f3a54b52',
    '._76cd190',
    '[data-testid="file-name"]',
  ];

  if (queryFirstForAttach(previewSelectors)) {
    return true;
  }

  const composerRoot =
    findPromptInput()?.closest(
      'form, [class*="composer"], [class*="input-area"], [class*="chat-input"], uploader-file-preview',
    ) ?? null;

  if (!composerRoot) {
    return false;
  }

  const baseName = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  const previewNode = composerRoot.querySelector?.(
    '.gem-attachment-text, .f3a54b52, [data-testid="file-name"], .gem-attachment-extension-label, gem-attachment, uploader-file-preview',
  );

  if (!previewNode) {
    return false;
  }

  const text = (previewNode.textContent ?? '').trim().toLowerCase();
  return (
    text.includes(baseName) ||
    text.includes('txt') ||
    text.includes('openbrowser-prompt') ||
    text.includes('.txt')
  );
}

async function waitForAttachComplete(fileName) {
  const deadline = Date.now() + ATTACH_PREVIEW_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (isPromptAlreadyAttached(fileName)) {
      return true;
    }
    await sleep(ATTACH_PREVIEW_POLL_MS);
  }

  return isPromptAlreadyAttached(fileName);
}

async function injectPrompt(message, options = {}) {
  const preserveAttachments = options.preserveAttachments === true;
  const input = findPromptInput();
  if (!input) {
    throw new Error('Chat input not found. Reload the AI chat tab and try again.');
  }

  input.focus();
  await sleep(100);

  const method = provider?.inject ?? (input instanceof HTMLTextAreaElement ? 'textarea' : 'prose-mirror');

  if (method === 'textarea' || input instanceof HTMLTextAreaElement) {
    await injectTextarea(input, message, { preserveAttachments });
    return;
  }

  if (method === 'lexical' || input.getAttribute('data-lexical-editor') === 'true') {
    await injectLexical(input, message, { preserveAttachments });
    return;
  }

  if (input.isContentEditable) {
    await injectProseMirror(input, message, { preserveAttachments });
    return;
  }

  throw new Error('Unsupported chat input element.');
}

async function injectTextarea(element, text, options = {}) {
  const preserveAttachments = options.preserveAttachments === true;
  element.focus();
  if (preserveAttachments && hasInjectedContent(element, text)) {
    return;
  }
  if (!preserveAttachments) {
    clearComposer(element);
    await sleep(50);
  } else {
    moveCaretToEnd(element);
    await sleep(50);
  }

  const prototype = window.HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, text);
  element.value = text;
  dispatchInput(element);
  element.dispatchEvent(new Event('change', { bubbles: true }));

  if (hasInjectedContent(element, text)) {
    dedupeInjectedTextarea(element, text);
    return;
  }

  document.execCommand('insertText', false, text);
  await sleep(50);
  dispatchInput(element);
  dedupeInjectedTextarea(element, text);
}

function dedupeInjectedTextarea(element, text) {
  const expected = text.trim();
  const actual = (element.value ?? '').trim();
  if (!expected || !actual) {
    return;
  }

  if (actual.length > expected.length * 1.05 && actual.includes(expected)) {
    element.value = expected;
    dispatchInput(element);
  }
}

async function injectLexical(element, text, options = {}) {
  const preserveAttachments = options.preserveAttachments === true;
  element.focus();
  if (preserveAttachments && hasInjectedContent(element, text)) {
    return;
  }
  if (!preserveAttachments) {
    clearComposer(element);
    await sleep(50);
  } else {
    moveCaretToEnd(element);
    await sleep(50);
  }

  dispatchPaste(element, text);
  await sleep(100);

  if (!hasInjectedContent(element, text)) {
    document.execCommand('insertText', false, text);
    await sleep(100);
  }

  if (!hasInjectedContent(element, text)) {
    element.innerHTML = `<p dir="auto">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  dedupeInjectedComposer(element, text);
  dispatchInput(element);
}

async function injectProseMirror(element, text, options = {}) {
  const preserveAttachments = options.preserveAttachments === true;
  element.focus();
  if (preserveAttachments && hasInjectedContent(element, text)) {
    return;
  }
  if (!preserveAttachments) {
    clearComposer(element);
    await sleep(50);
  } else {
    moveCaretToEnd(element);
    await sleep(50);
  }

  document.execCommand('insertText', false, text);
  await sleep(100);

  if (hasInjectedContent(element, text)) {
    dedupeInjectedComposer(element, text);
    dispatchInput(element);
    return;
  }

  clearComposer(element);
  dispatchPaste(element, text);
  await sleep(150);

  if (!hasInjectedContent(element, text)) {
    element.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }

  dedupeInjectedComposer(element, text);
  dispatchInput(element);
}

function dedupeInjectedComposer(element, text) {
  const expected = text.trim();
  if (!expected) {
    return;
  }

  const actual = (
    element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
      ? element.value
      : (element.textContent ?? '')
  ).trim();

  if (!actual || actual.length <= expected.length * 1.05) {
    return;
  }

  if (actual.includes(expected) && actual.length > expected.length * 1.05) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.value = expected;
    } else {
      element.textContent = expected;
    }
  }
}

function clearComposer(element) {
  element.focus();
  selectAll(element);
  document.execCommand('delete', false);
}

function moveCaretToEnd(element) {
  element.focus();
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const length = element.value?.length ?? 0;
    element.setSelectionRange(length, length);
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function hasInjectedContent(element, text) {
  const actual = (
    element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
      ? element.value
      : (element.textContent ?? '')
  ).trim();
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

function canSubmitComposer(fileName) {
  const input = findPromptInput();
  if (input && hasComposerContent(input)) {
    return true;
  }

  if (fileName && isPromptAlreadyAttached(fileName)) {
    return true;
  }

  return false;
}

async function clickSendAfterFileAttach(fileName, composerMessage) {
  // ChatGPT keeps send disabled while the file is still uploading.
  await sleep(FILE_UPLOAD_SEND_WAIT_MS);

  await injectPrompt(composerMessage, { preserveAttachments: true });
  await sleep(300);

  if (await trySubmitSend(fileName)) {
    return;
  }

  await sleep(FILE_UPLOAD_SEND_RETRY_WAIT_MS);

  await injectPrompt(composerMessage, { preserveAttachments: true });
  await sleep(300);

  if (await trySubmitSend(fileName)) {
    return;
  }

  throw new Error('Send button did not submit after file upload.');
}

async function trySubmitSend(fileName) {
  const input = findPromptInput();
  input?.focus();
  await sleep(100);

  const button = findSendButton();
  if (button) {
    button.click();
    if (await verifyMessageSubmitted()) {
      return true;
    }

    clickElementWithPointerEvents(button);
    if (await verifyMessageSubmitted()) {
      return true;
    }
  }

  if (input && canSubmitComposer(fileName)) {
    await submitViaEnter(input);
    if (await verifyMessageSubmitted()) {
      return true;
    }
  }

  return false;
}

async function clickSendWhenReady() {
  for (let attempt = 0; attempt < SEND_MAX_RETRIES; attempt += 1) {
    const button = findSendButton();
    if (button && isSendButtonEnabled(button)) {
      button.click();
      if (await verifyMessageSubmitted()) {
        return;
      }
      clickElementWithPointerEvents(button);
      if (await verifyMessageSubmitted()) {
        return;
      }
    }

    const input = findPromptInput();
    if (input && hasComposerContent(input) && attempt >= 2) {
      await submitViaEnter(input);
      if (await verifyMessageSubmitted()) {
        return;
      }
    }

    await sleep(SEND_RETRY_MS);
  }

  throw new Error('Send button stayed disabled. The page did not accept the injected prompt.');
}

function clickElementWithPointerEvents(element) {
  element.focus();
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const eventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };

  element.dispatchEvent(new PointerEvent('pointerdown', eventInit));
  element.dispatchEvent(new MouseEvent('mousedown', eventInit));
  element.dispatchEvent(new PointerEvent('pointerup', eventInit));
  element.dispatchEvent(new MouseEvent('mouseup', eventInit));
  element.dispatchEvent(new MouseEvent('click', eventInit));
}

async function verifyMessageSubmitted() {
  await sleep(400);

  if (findStopButton()) {
    return true;
  }

  const input = findPromptInput();
  if (input && !hasComposerContent(input)) {
    return true;
  }

  const button = findSendButton();
  if (button && !isSendButtonEnabled(button)) {
    return true;
  }

  return false;
}

function findStopButton() {
  if (!provider?.selectors?.stop) {
    return null;
  }

  for (const selector of provider.selectors.stop) {
    const node = document.querySelector(selector);
    if (node && isElementVisible(node)) {
      return node;
    }
  }

  return null;
}

function isElementVisible(element) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

function isSendButtonEnabled(button) {
  if (!button) {
    return false;
  }

  if (!isElementVisible(button)) {
    return false;
  }

  if (button.disabled === true) {
    return false;
  }

  if (button.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  if (button.classList?.contains('ds-button--disabled')) {
    return false;
  }

  const style = window.getComputedStyle(button);
  if (style.pointerEvents === 'none') {
    return false;
  }

  return true;
}

function hasComposerContent(input) {
  if (input instanceof HTMLTextAreaElement) {
    return (input.value ?? '').trim().length > 0;
  }

  return (input.textContent ?? input.innerText ?? '').trim().length > 0;
}

async function submitViaEnter(input) {
  input.focus();
  await sleep(50);

  for (const type of ['keydown', 'keypress', 'keyup']) {
    input.dispatchEvent(
      new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      }),
    );
  }
}

function findSendButton() {
  if (!provider) {
    return null;
  }

  const seen = new Set();
  const candidates = [];

  for (const selector of provider.selectors.send) {
    for (const node of document.querySelectorAll(selector)) {
      if (!seen.has(node)) {
        seen.add(node);
        candidates.push(node);
      }
    }
  }

  const visible = candidates.filter((button) => isElementVisible(button));

  for (const button of visible) {
    if (isSendButtonEnabled(button)) {
      return button;
    }
  }

  return visible[0] ?? candidates[0] ?? null;
}

async function waitForPlainResponse(beforeCount, mode, sessionId, options = {}) {
  const text = await waitForAssistantText(beforeCount, mode, sessionId, options);
  if (!text) {
    throw new Error('No assistant response detected.');
  }
  return text;
}

async function waitForAssistantText(beforeCount, mode, sessionId, options = {}) {
  const markdownDraft = options.markdownDraft === true;
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  let lastText = '';
  let stableSince = 0;
  let lastChunkText = '';
  let lastChunkAt = 0;
  let lastPreLength = 0;

  while (Date.now() < deadline) {
    const text = getLatestAssistantText(beforeCount, mode === 'agent', { markdownDraft });
    if (text) {
      const preLength = markdownDraft ? measureMarkdownPreLength(beforeCount) : 0;
      if (markdownDraft && preLength > lastPreLength) {
        lastPreLength = preLength;
        stableSince = Date.now();
      }

      if (mode === 'ask' && sessionId && shouldPostChunk(text, lastChunkText, lastChunkAt)) {
        await postBrowserChunk({ sessionId, text });
        lastChunkText = text;
        lastChunkAt = Date.now();
      }

      const stableMs = getStableMs(text, mode, markdownDraft);
      if (text === lastText) {
        if (Date.now() - stableSince >= stableMs && canFinishResponse()) {
          await sleep(FINISH_RECHECK_MS);
          const recheck = getLatestAssistantText(beforeCount, mode === 'agent', { markdownDraft });
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

  const finalText = getLatestAssistantText(beforeCount, mode === 'agent', { markdownDraft });
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

function getStableMs(text, mode, markdownDraft = false) {
  if (mode === 'ask' && markdownDraft) {
    return ASK_DRAFT_STABLE_MS;
  }

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
        new RegExp(`---OB_FILE_BEGIN:\\s*${escapeRegex(path)}---`, 'i').test(text) ||
        (/\.md$/i.test(path) &&
          (/```(?:markdown|md)\s*\n/i.test(text) ||
            /```\n#\s/m.test(text) ||
            /"operations"\s*:\s*\[/.test(text))) ||
        new RegExp(`\`\`\`file:${escapeRegex(path)}`, 'i').test(text) ||
        new RegExp(`\`\`\`${escapeRegex(path)}`, 'i').test(text);

      if (!hasBlock && /\.md$/i.test(path) && !/"operations"\s*:\s*\[/.test(text)) {
        return true;
      }

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

function getCaptureRoot(node) {
  return (
    node.querySelector?.('.prose[data-renderer="lm"]') ??
    (node.classList?.contains('prose') ? node : null) ??
    node
  );
}

function collectMarkdownPreContents(captureRoot) {
  const blocks = [];
  for (const pre of captureRoot.querySelectorAll('pre')) {
    const code = pre.querySelector('code') ?? pre;
    const content = (code.textContent ?? '').replace(/\n$/, '').trim();
    if (!content || looksLikeOperationsJson(content)) {
      continue;
    }
    if (looksLikeMarkdownPre(pre, content) || /^#\s/m.test(content)) {
      blocks.push(content);
    }
  }
  return blocks;
}

function measureMarkdownPreLength(beforeCount) {
  const nodes = collectAssistantNodes().slice(beforeCount);
  let total = 0;
  for (const node of nodes) {
    for (const content of collectMarkdownPreContents(getCaptureRoot(node))) {
      total += content.length;
    }
  }
  return total;
}

function extractOperationsJsonFromNode(captureRoot, fullText) {
  for (const pre of captureRoot.querySelectorAll('pre')) {
    const code = pre.querySelector('code') ?? pre;
    const content = (code.textContent ?? '').trim();
    if (content && looksLikeOperationsJson(content)) {
      return content;
    }
  }

  const fromText = extractJsonObject(fullText ?? '');
  if (fromText && looksLikeOperationsJson(fromText)) {
    return fromText.trim();
  }

  return null;
}

function buildAskCaptureText(node) {
  const captureRoot = getCaptureRoot(node);
  const markdownBlocks = collectMarkdownPreContents(captureRoot);

  if (markdownBlocks.length > 0) {
    const best = [...markdownBlocks].sort((a, b) => b.length - a.length)[0];
    return `\`\`\`markdown\n${best}\n\`\`\``;
  }

  return extractMessageText(node) ?? '';
}

function getLatestAssistantText(beforeCount, agentMode = false, options = {}) {
  const responseNodes = collectAssistantNodes();
  if (responseNodes.length <= beforeCount) {
    return null;
  }

  const newNodes = responseNodes.slice(beforeCount);
  const latest = newNodes[newNodes.length - 1];
  latest.scrollIntoView({ block: 'end', behavior: 'instant' });

  if (!agentMode) {
    const captured = newNodes.map((node) => buildAskCaptureText(node)).filter(Boolean).join('\n\n');
    return captured || mergeAssistantTexts(newNodes);
  }

  const withObMarker = [...newNodes]
    .reverse()
    .find((node) => /---OB_FILE_BEGIN:/i.test(extractMessageText(node) ?? ''));

  if (withObMarker) {
    return buildAgentCaptureText(withObMarker);
  }

  if (newNodes.length > 1) {
    const merged = mergeAssistantTexts(newNodes);
    if (merged && /---OB_FILE_BEGIN:/i.test(merged)) {
      return normalizeObFileCaptureText(merged);
    }
  }

  return buildAgentCaptureText(latest);
}

function mergeAssistantTexts(nodes) {
  return nodes
    .map((node) => extractMessageText(node))
    .filter(Boolean)
    .join('\n\n');
}

const OB_FILE_BLOCK_CAPTURE_RE =
  /---OB_FILE_BEGIN:\s*([^\n]+?)---\s*([\s\S]*?)---OB_FILE_END---/gi;

function extractPreCodeText(element) {
  const html = element.innerHTML ?? '';
  if (/<br\s*\/?>/i.test(html)) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n$/, '');
  }

  return (element.textContent ?? '').replace(/\n$/, '');
}

function normalizeYamlCaptureText(content) {
  let text = content.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
  if ((text.match(/\n/g) ?? []).length >= 3) {
    return text;
  }

  if (!/\w\s*:/.test(text)) {
    return text;
  }

  const rawParts = text.split(/\s+(?=[A-Za-z_][\w-]*:(?:\s|$|"|'|-))/);
  if (rawParts.length <= 1) {
    return text;
  }

  const lines = [];
  let section = 'root';

  for (let part of rawParts) {
    part = part.trim();
    if (!part) {
      continue;
    }

    const listInline = /^([A-Za-z_][\w-]*):\s+(-\s.+)$/i.exec(part);
    if (listInline) {
      const indent = section === 'service' ? 4 : section === 'services' ? 2 : 0;
      lines.push(`${' '.repeat(indent)}${listInline[1]}:`);
      lines.push(`${' '.repeat(indent + 2)}${listInline[2]}`);
      continue;
    }

    if (/^version:/i.test(part)) {
      lines.push(part);
      section = 'root';
    } else if (/^services:/i.test(part)) {
      lines.push(part);
      section = 'services';
    } else if (section === 'services' && /^[a-z][\w_-]*:/i.test(part)) {
      lines.push(`  ${part}`);
      section = 'service';
    } else if (section === 'service') {
      lines.push(`    ${part}`);
    } else {
      lines.push(part);
    }
  }

  return lines.join('\n');
}

function normalizeObFileCaptureText(text) {
  const blocks = [];
  for (const match of text.matchAll(OB_FILE_BLOCK_CAPTURE_RE)) {
    const path = normalizeCapturePath((match[1] ?? '').trim());
    let content = (match[2] ?? '').trim();
    if (path && /\.ya?ml$/i.test(path)) {
      content = normalizeYamlCaptureText(content);
    }
    if (path && content) {
      blocks.push({ path, content });
    }
  }

  if (blocks.length === 0) {
    return text;
  }

  const beginIndex = text.search(/---OB_FILE_BEGIN:/i);
  const prefix = beginIndex > 0 ? text.slice(0, beginIndex).trim() : '';
  const serialized = blocks.map(
    (block) => `---OB_FILE_BEGIN: ${block.path}---\n${block.content}\n---OB_FILE_END---`,
  );

  return [prefix, ...serialized].filter(Boolean).join('\n\n');
}

function buildAgentCaptureText(node) {
  const captureRoot = getCaptureRoot(node);
  let fullText = extractMessageText(captureRoot) ?? extractMessageText(node);

  if (fullText && /---OB_FILE_BEGIN:/i.test(fullText)) {
    return normalizeObFileCaptureText(fullText);
  }

  const parts = [];
  const jsonParts = [];
  const markdownPres = [];
  const pres = [...captureRoot.querySelectorAll('pre')];

  const opsFromNode = extractOperationsJsonFromNode(captureRoot, fullText);
  if (opsFromNode) {
    jsonParts.push(opsFromNode);
  }

  for (const pre of pres) {
    const code = pre.querySelector('code') ?? pre;
    const content = extractPreCodeText(code);
    if (!content.trim()) {
      continue;
    }

    if (looksLikeOperationsJson(content)) {
      const trimmed = content.trim();
      if (!jsonParts.includes(trimmed)) {
        parts.push(trimmed);
        jsonParts.push(trimmed);
      }
      continue;
    }

    if (looksLikeMarkdownPre(pre, content)) {
      markdownPres.push(content.trim());
      continue;
    }

    const path = findPathForPre(pre) ?? inferPathFromContent(content);
    if (path && /\.md$/i.test(path)) {
      markdownPres.push(content.trim());
      continue;
    }

    if (path) {
      const fileContent =
        /\.ya?ml$/i.test(path) ? normalizeYamlCaptureText(content.trim()) : content.trim();
      parts.push(`---OB_FILE_BEGIN: ${path}---\n${fileContent}\n---OB_FILE_END---`);
    } else {
      parts.push(`\`\`\`\n${content.trim()}\n\`\`\``);
    }
  }

  if (jsonParts.length > 0 && markdownPres.length > 0 && jsonCreatesMdFile(jsonParts.join('\n'))) {
    const mdContent = [...markdownPres].sort((a, b) => b.length - a.length)[0];
    return `${jsonParts.join('\n\n')}\n\n\`\`\`markdown\n${mdContent}\n\`\`\``;
  }

  if (jsonParts.length > 0 && markdownPres.length === 0 && jsonCreatesMdFile(jsonParts.join('\n'))) {
    return jsonParts.join('\n\n');
  }

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  if (fullText && /```(?:markdown|md)\s*\n/i.test(fullText)) {
    return fullText;
  }

  if (fullText && looksLikeOperationsJson(extractJsonObject(fullText))) {
    return fullText;
  }

  return fullText;
}

function looksLikeMarkdownPre(pre, content) {
  const code = pre.querySelector('code') ?? pre;
  const className = code.className ?? '';
  if (/language-(markdown|md)\b/i.test(className)) {
    return true;
  }

  const text = content.trim();
  return /^#\s/m.test(text) || (text.includes('## ') && text.includes('\n- '));
}

function jsonCreatesMdFile(jsonText) {
  try {
    const parsed = JSON.parse(extractJsonObject(jsonText));
    return (
      Array.isArray(parsed?.operations) &&
      parsed.operations.some(
        (operation) =>
          operation?.action === 'CREATE_FILE' && /\.md$/i.test(operation.path ?? ''),
      )
    );
  } catch {
    return false;
  }
}

function inferPathFromContent(content) {
  const text = content.trim();
  if (!text) {
    return null;
  }

  if (/express\.Router|router\.get|router\.post|module\.exports\s*=\s*router/i.test(text)) {
    return 'src/routes/userRoutes.js';
  }

  if (/app\.listen|app\.use\(\s*['"]\/api/i.test(text) && /userRoutes|require\(['"]\.\/routes/i.test(text)) {
    return 'src/server.js';
  }

  if (/getUsers|listUsers|module\.exports\s*=\s*\{/i.test(text) && /res\.(status|json)/i.test(text)) {
    return 'src/controllers/userController.js';
  }

  if (text.startsWith('{') && text.includes('"name"') && text.includes('"version"')) {
    return 'package.json';
  }

  return null;
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
  for (const match of text.matchAll(OB_FILE_BLOCK_CAPTURE_RE)) {
    const path = normalizeCapturePath(match[1] ?? '');
    const content = (match[2] ?? '').trim();
    if (path && content) {
      blocks.push({ path, content });
    }
  }

  for (const match of text.matchAll(/```file:([^\n`]+\.md)\s*\n([\s\S]*?)```/gi)) {
    const path = normalizeCapturePath(match[1] ?? '');
    const content = (match[2] ?? '').trim();
    if (path && content) {
      blocks.push({ path, content });
    }
  }

  for (const match of text.matchAll(/```(?:markdown|md)\s*\n([\s\S]*?)```/gi)) {
    const content = (match[1] ?? '').trim();
    if (content) {
      blocks.push({ path: '', content });
    }
  }

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
  const fromLabel = findNearestFileLabelBefore(pre);
  if (fromLabel) {
    return fromLabel;
  }

  let sibling = pre.previousElementSibling;
  for (let step = 0; step < 6 && sibling; step += 1) {
    const path = extractPathFromLabel(sibling.textContent ?? '');
    if (path) {
      return path;
    }
    sibling = sibling.previousElementSibling;
  }

  const parent = pre.parentElement;
  if (parent) {
    const parentPath = extractPathFromLabel(parent.textContent ?? '');
    if (parentPath && parent.textContent?.length && parent.textContent.length < 120) {
      return parentPath;
    }
  }

  const container = pre.closest('[data-message-author-role="assistant"], article');
  if (container) {
    let previous = pre.previousElementSibling;
    while (previous) {
      const path = extractPathFromLabel(previous.textContent ?? '');
      if (path) {
        return path;
      }
      previous = previous.previousElementSibling;
    }

    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, span, button, a');
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

function findNearestFileLabelBefore(pre) {
  const container = pre.closest('[data-message-author-role="assistant"], article');
  if (!container) {
    return null;
  }

  const elements = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    elements.push(node);
    node = walker.nextNode();
  }

  const preIndex = elements.indexOf(pre);
  if (preIndex <= 0) {
    return null;
  }

  for (let i = preIndex - 1; i >= 0; i -= 1) {
    const el = elements[i];
    if (!el || el === pre || pre.contains(el) || el.contains(pre)) {
      continue;
    }

    const otherPre = el.closest('pre');
    if (otherPre && otherPre !== pre) {
      continue;
    }

    const text = (el.textContent ?? '').trim();
    if (!text || text.length > 160) {
      continue;
    }

    const path = extractPathFromLabel(text);
    if (!path) {
      continue;
    }

    if (/^file:\s*\S+/i.test(text) || isPathOnlyLabel(text, path)) {
      return path;
    }
  }

  return null;
}

function isPathOnlyLabel(text, path) {
  const compact = text.replace(/\s+/g, '');
  const normalized = path.replace(/^\.\//, '');
  return compact === `file:${normalized}` || compact === normalized || compact.endsWith(normalized);
}

function extractPathFromLabel(text) {
  const trimmed = text.trim();
  const filePrefix = /^file:\s*(\S+)/i.exec(trimmed);
  if (filePrefix?.[1]) {
    return normalizeCapturePath(filePrefix[1]);
  }

  const match = /([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)/.exec(trimmed);
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
