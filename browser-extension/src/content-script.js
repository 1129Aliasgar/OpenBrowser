const RESPONSE_TIMEOUT_MS = 180_000;
const STABLE_MS = 2_000;
const ASK_STABLE_MS = 3_000;
const ASK_DRAFT_STABLE_MS = 5_000;
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
  await sleep(150);
  await clickSendWhenReady();

  const text = await waitForPlainResponse(beforeCount, job.mode, job.sessionId, {
    markdownDraft: job.markdownDraft,
  });
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
  clearComposer(element);
  await sleep(50);

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

async function clickSendWhenReady() {
  for (let attempt = 0; attempt < SEND_MAX_RETRIES; attempt += 1) {
    const button = findSendButton();
    if (button && isSendButtonEnabled(button)) {
      button.click();
      button.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
      );
      return;
    }

    const input = findPromptInput();
    if (input && hasComposerContent(input) && attempt >= 2) {
      await submitViaEnter(input);
      return;
    }

    await sleep(SEND_RETRY_MS);
  }

  throw new Error('Send button stayed disabled. The page did not accept the injected prompt.');
}

function isSendButtonEnabled(button) {
  if (!button) {
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
  if (style.pointerEvents === 'none' || style.visibility === 'hidden' || style.display === 'none') {
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

  for (const button of candidates) {
    if (isSendButtonEnabled(button)) {
      return button;
    }
  }

  return candidates[0] ?? null;
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
