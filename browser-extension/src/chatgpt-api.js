(() => {
  const HOSTS = ['chatgpt.com', 'chat.openai.com'];
  const CAPTURE_PATHS = ['/backend-api/f/conversation'];
  const CAPTURE_METHOD = 'POST';
  const CHUNK_POST_MIN_MS = 120;

  if (!HOSTS.includes(window.location.hostname)) return;
  if (window.__openbrowserChatGptApiCaptureInstalled) return;
  window.__openbrowserChatGptApiCaptureInstalled = true;

  const originalFetch = window.fetch.bind(window);

  function post(payload) {
    window.postMessage({ source: 'openbrowser-chatgpt-api', ...payload }, '*');
  }

  function partIndexFromPath(path) {
    const match = /^\/message\/content\/parts\/(\d+)/.exec(path ?? '');
    return match ? Number(match[1]) : null;
  }

  function textFromState(state) {
    const keys = [...state.fragments.keys()].sort((a, b) => a - b);
    return keys.map((key) => state.fragments.get(key)).join('\n\n');
  }

  function handleDelta(data, state) {
    if (!data || typeof data !== 'object') return;
    const value = data.v;

    if (data.o && typeof data.p === 'string') {
      state.currentPath = data.p;
      const index = partIndexFromPath(data.p);
      if (index !== null && typeof value === 'string') {
        const existing = state.fragments.get(index) ?? '';
        state.fragments.set(index, data.o === 'replace' ? value : existing + value);
      }
      return;
    }

    if (typeof value === 'string') {
      const index = partIndexFromPath(state.currentPath);
      if (index !== null) {
        const existing = state.fragments.get(index) ?? '';
        state.fragments.set(index, existing + value);
      }
      return;
    }

    if (value && typeof value === 'object' && value.message) {
      const message = value.message;
      if (
        message.author?.role === 'assistant' &&
        message.content?.content_type === 'text' &&
        Array.isArray(message.content.parts)
      ) {
        for (let index = 0; index < message.content.parts.length; index += 1) {
          const part = message.content.parts[index];
          if (typeof part === 'string' && !state.fragments.has(index)) {
            state.fragments.set(index, part);
          }
        }
        if (message.status === 'finished_successfully' && message.end_turn === true) {
          state.done = true;
        }
      }
    }
  }

  function handleSseBlock(block, state) {
    const normalized = block.replace(/\r\n/g, '\n');
    if (!normalized.trim() || normalized.startsWith(':')) return;

    let event = 'message';
    const dataLines = [];
    for (const line of normalized.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return;
    const rawData = dataLines.join('\n');
    if (rawData === '[DONE]') {
      state.done = true;
      return;
    }

    let data;
    try {
      data = JSON.parse(rawData);
    } catch {
      return;
    }

    if (event === 'delta') {
      handleDelta(data, state);
      return;
    }

    if (data && typeof data === 'object' && data.type === 'message_stream_complete') {
      state.done = true;
    }
  }

  function createState() {
    return { fragments: new Map(), currentPath: null, done: false };
  }

  async function readCaptureStream(stream, captureId, state) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastText = '';
    let lastChunkAt = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separator;
        while ((separator = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          handleSseBlock(block, state);

          const text = textFromState(state);
          if (text && text !== lastText && Date.now() - lastChunkAt >= CHUNK_POST_MIN_MS) {
            lastText = text;
            lastChunkAt = Date.now();
            post({ type: 'capture-chunk', captureId, text });
          }
          if (state.done) break;
        }
        if (state.done) break;
      }

      if (buffer) {
        handleSseBlock(buffer, state);
      }

      post({ type: 'capture-done', captureId, text: textFromState(state) });
    } catch (error) {
      const partialText = textFromState(state);
      if (partialText) {
        post({ type: 'capture-done', captureId, text: partialText });
      } else {
        post({
          type: 'capture-error',
          captureId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  function shouldCapture(url, method) {
    try {
      const parsed = new URL(url, window.location.origin);
      return method === CAPTURE_METHOD && CAPTURE_PATHS.some((path) => parsed.pathname.endsWith(path));
    } catch {
      return false;
    }
  }

  function captureResponse(response) {
    const captureId =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/event-stream') || !response.body) {
      return response;
    }

    const [pageStream, captureStream] = response.body.tee();
    const forPage = new Response(pageStream, response);
    const state = createState();
    post({ type: 'capture-begin', captureId, at: Date.now() });
    void readCaptureStream(captureStream, captureId, state);
    return forPage;
  }

  window.fetch = async function (...args) {
    const input = args[0];
    const init = args[1] ?? {};
    const url = typeof input === 'string' ? input : input?.url;
    const method = String(init.method ?? input?.method ?? 'GET').toUpperCase();
    const response = await originalFetch(...args);
    if (!shouldCapture(url, method) || !response?.body) {
      return response;
    }
    return captureResponse(response);
  };
})();
