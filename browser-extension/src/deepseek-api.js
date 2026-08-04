(() => {
  const HOSTS = ['chat.deepseek.com'];
  const CAPTURE_PATHS = ['/api/v0/chat/completion'];
  const CAPTURE_METHOD = 'POST';
  const CHUNK_POST_MIN_MS = 120;

  if (!HOSTS.includes(window.location.hostname)) return;
  if (window.__openbrowserDeepSeekApiCaptureInstalled) return;
  window.__openbrowserDeepSeekApiCaptureInstalled = true;

  const originalFetch = window.fetch.bind(window);

  function post(payload) {
    window.postMessage({ source: 'openbrowser-deepseek-api', ...payload }, '*');
  }

  function shouldCapture(url, method) {
    try {
      const parsed = new URL(url, window.location.origin);
      return (
        method === CAPTURE_METHOD &&
        CAPTURE_PATHS.some((path) => parsed.pathname.endsWith(path))
      );
    } catch {
      return false;
    }
  }

  function createState() {
    return { buffer: '', text: '', done: false };
  }

  function handleDeepSeekData(data, state) {
    if (!data || typeof data !== 'object') {
      return;
    }
    const value = data.v;

    if (value && typeof value === 'object' && value.response) {
      const fragments = value.response?.fragments;
      if (Array.isArray(fragments)) {
        const content = fragments
          .filter(
            (fragment) =>
              fragment &&
              typeof fragment.content === 'string' &&
              fragment.type !== 'THINKING',
          )
          .map((fragment) => fragment.content)
          .join('');
        if (content) {
          if (!state.text || (content.length > state.text.length && content.startsWith(state.text))) {
            state.text = content;
          }
        }
      }
      return;
    }

    if (data.o === 'BATCH' && Array.isArray(value)) {
      if (
        value.some((patch) => patch?.p === 'quasi_status' && patch?.v === 'FINISHED')
      ) {
        state.done = true;
      }
      return;
    }

    if (data.p === 'response/status' && data.o === 'SET') {
      if (value === 'FINISHED') {
        state.done = true;
      }
      return;
    }

    if (typeof value === 'string') {
      if (data.o === 'APPEND' || (!data.p && !data.o)) {
        state.text += value;
      }
    }
  }

  function handleSseBlock(block, state) {
    const normalized = block.replace(/\r\n/g, '\n');
    if (!normalized.trim() || normalized.startsWith(':')) {
      return;
    }

    const dataLines = [];
    for (const line of normalized.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length === 0) {
      return;
    }

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
    handleDeepSeekData(data, state);
  }

  function feedSseText(chunk, state) {
    state.buffer += chunk;
    let separator;
    while ((separator = state.buffer.indexOf('\n\n')) !== -1) {
      const block = state.buffer.slice(0, separator);
      state.buffer = state.buffer.slice(separator + 2);
      handleSseBlock(block, state);
      if (state.done) {
        break;
      }
    }
  }

  function flushSseBuffer(state) {
    if (state.buffer.trim()) {
      handleSseBlock(state.buffer, state);
      state.buffer = '';
    }
  }

  async function readCaptureStream(stream, captureId, state) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let lastText = '';
    let lastChunkAt = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        feedSseText(decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n'), state);

        const text = state.text;
        if (text && text !== lastText && Date.now() - lastChunkAt >= CHUNK_POST_MIN_MS) {
          lastText = text;
          lastChunkAt = Date.now();
          post({ type: 'capture-chunk', captureId, text });
        }
        if (state.done) {
          break;
        }
      }

      flushSseBuffer(state);
      post({ type: 'capture-done', captureId, text: state.text });
    } catch (error) {
      flushSseBuffer(state);
      if (state.text) {
        post({ type: 'capture-done', captureId, text: state.text });
      } else {
        post({
          type: 'capture-error',
          captureId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
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

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__openbrowserDeepSeekUrl = url ?? '';
    this.__openbrowserDeepSeekMethod = String(method ?? 'GET').toUpperCase();
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    if (shouldCapture(xhr.__openbrowserDeepSeekUrl, xhr.__openbrowserDeepSeekMethod)) {
      const captureId =
        typeof crypto?.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const state = createState();
      let lastLength = 0;
      let lastText = '';
      let lastChunkAt = 0;

      post({ type: 'capture-begin', captureId, at: Date.now() });

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState < 3) {
          return;
        }

        let raw = '';
        try {
          raw = xhr.responseText ?? '';
        } catch {
          raw = '';
        }
        if (raw.length > lastLength) {
          feedSseText(raw.slice(lastLength).replace(/\r\n/g, '\n'), state);
          lastLength = raw.length;

          const text = state.text;
          if (text && text !== lastText && Date.now() - lastChunkAt >= CHUNK_POST_MIN_MS) {
            lastText = text;
            lastChunkAt = Date.now();
            post({ type: 'capture-chunk', captureId, text });
          }
        }

        if (xhr.readyState === 4) {
          flushSseBuffer(state);
          post({ type: 'capture-done', captureId, text: state.text });
        }
      });
    }
    return originalXhrSend.apply(this, args);
  };
})();
