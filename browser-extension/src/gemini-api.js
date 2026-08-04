(() => {
  const HOSTS = ['gemini.google.com'];
  const CAPTURE_PATH_RE =
    /\/_\/BardChatUi\/data\/assistant\.lamda\.BardFrontendService\/StreamGenerate/;
  const CAPTURE_METHOD = 'POST';
  const CHUNK_POST_MIN_MS = 120;

  if (!HOSTS.includes(window.location.hostname)) return;
  if (window.__openbrowserGeminiApiCaptureInstalled) return;
  window.__openbrowserGeminiApiCaptureInstalled = true;

  const originalFetch = window.fetch.bind(window);

  function makeCaptureId() {
    return typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function post(payload) {
    window.postMessage({ source: 'openbrowser-gemini-api', ...payload }, '*');
  }

  function shouldCapture(url, method) {
    try {
      const parsed = new URL(url, window.location.origin);
      return method === CAPTURE_METHOD && CAPTURE_PATH_RE.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function extractTextFromPayload(payload, currentTargetId) {
    let outer;
    try {
      outer = JSON.parse(payload);
    } catch {
      return { targetId: currentTargetId, text: '' };
    }
    if (!Array.isArray(outer)) {
      return { targetId: currentTargetId, text: '' };
    }

    let targetId = currentTargetId;
    let best = '';

    for (const entry of outer) {
      if (!Array.isArray(entry) || entry[0] !== 'wrb.fr') {
        continue;
      }
      const raw = entry[2];
      if (typeof raw !== 'string') {
        continue;
      }

      let inner;
      try {
        inner = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!Array.isArray(inner)) {
        continue;
      }

      const chunks = inner[4];
      if (!Array.isArray(chunks)) {
        continue;
      }

      for (const chunk of chunks) {
        if (!Array.isArray(chunk)) {
          continue;
        }
        const id = chunk[0];
        if (typeof id !== 'string' || !id.startsWith('rc_')) {
          continue;
        }
        if (targetId === null) {
          targetId = id;
        }
        if (id !== targetId) {
          continue;
        }
        const texts = chunk[1];
        if (!Array.isArray(texts)) {
          continue;
        }
        for (const text of texts) {
          if (typeof text === 'string' && text.length > best.length) {
            best = text;
          }
        }
      }
    }

    return { targetId, text: best };
  }

  function isDigitByte(byte) {
    return byte >= 48 && byte <= 57;
  }

  function processBytes(bytes) {
    let pos = 0;
    let targetId = null;
    let best = '';
    const decoder = new TextDecoder();

    while (pos < bytes.length && !isDigitByte(bytes[pos])) {
      pos += 1;
    }

    while (pos < bytes.length) {
      let nl = pos;
      while (nl < bytes.length && bytes[nl] !== 10) {
        nl += 1;
      }
      if (nl >= bytes.length) {
        break;
      }

      const numLine = decoder.decode(bytes.subarray(pos, nl)).replace(/\r$/, '');
      if (!/^\d+$/.test(numLine)) {
        pos = nl + 1;
        continue;
      }

      const size = Number(numLine);
      const start = nl + 1;
      const candidates = [size - 2, size - 1, size].filter((len) => len >= 0);
      let payload = '';
      let consumed = null;
      for (const candidateLength of candidates) {
        const end = start + candidateLength;
        if (end > bytes.length) {
          continue;
        }
        const candidate = decoder.decode(bytes.subarray(start, end));
        try {
          JSON.parse(candidate);
          payload = candidate;
          consumed = candidateLength;
          break;
        } catch {
          // Not a complete frame; try the next candidate length.
        }
      }
      if (consumed === null) {
        break;
      }

      const result = extractTextFromPayload(payload, targetId);
      targetId = result.targetId;
      if (result.text.length > best.length) {
        best = result.text;
      }
      pos = start + consumed;
    }

    return best;
  }

  async function readCaptureStream(stream, captureId) {
    const reader = stream.getReader();
    let acc = new Uint8Array(0);
    let lastText = '';
    let lastChunkAt = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (!value || value.length === 0) {
          continue;
        }

        const merged = new Uint8Array(acc.length + value.length);
        merged.set(acc, 0);
        merged.set(value, acc.length);
        acc = merged;

        const text = processBytes(acc);
        if (text && text !== lastText && Date.now() - lastChunkAt >= CHUNK_POST_MIN_MS) {
          lastText = text;
          lastChunkAt = Date.now();
          post({ type: 'capture-chunk', captureId, text });
        }
      }

      const finalText = processBytes(acc);
      post({ type: 'capture-done', captureId, text: finalText });
    } catch (error) {
      const partial = processBytes(acc);
      if (partial) {
        post({ type: 'capture-done', captureId, text: partial });
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
    const captureId = makeCaptureId();
    if (!response?.body) {
      return response;
    }

    const [pageStream, captureStream] = response.body.tee();
    const forPage = new Response(pageStream, response);
    post({ type: 'capture-begin', captureId, at: Date.now() });
    void readCaptureStream(captureStream, captureId);
    return forPage;
  }

  window.fetch = async function (...args) {
    const input = args[0];
    const init = args[1] ?? {};
    const url = typeof input === 'string' ? input : input?.url;
    const method = String(init.method ?? input?.method ?? 'GET').toUpperCase();
    const response = await originalFetch(...args);
    if (!shouldCapture(url, method)) {
      return response;
    }
    return captureResponse(response);
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__openbrowserCaptureUrl = url ?? '';
    this.__openbrowserCaptureMethod = String(method ?? 'GET').toUpperCase();
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  function decodeXhrBody(xhr) {
    try {
      const text = xhr.responseText;
      if (typeof text === 'string') {
        return text;
      }
    } catch {
      // responseText unavailable for non-text responseType.
    }
    try {
      const response = xhr.response;
      if (response instanceof ArrayBuffer) {
        return new TextDecoder().decode(response);
      }
      if (typeof Blob !== 'undefined' && response instanceof Blob) {
        return null;
      }
    } catch {
      // ignore
    }
    return '';
  }

  async function decodeXhrBodyAsync(xhr) {
    const text = decodeXhrBody(xhr);
    if (text !== null) {
      return text;
    }
    try {
      const response = xhr.response;
      if (typeof Blob !== 'undefined' && response instanceof Blob) {
        return await response.text();
      }
    } catch {
      // ignore
    }
    return '';
  }

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    if (shouldCapture(xhr.__openbrowserCaptureUrl, xhr.__openbrowserCaptureMethod)) {
      const captureId = makeCaptureId();
      post({ type: 'capture-begin', captureId, at: Date.now() });

      let lastBody = '';
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState >= 3 && xhr.readyState < 4) {
          const body = decodeXhrBody(xhr);
          if (body === null) {
            return;
          }
          const text = processBytes(new TextEncoder().encode(body));
          if (text && text !== lastBody) {
            lastBody = text;
            post({ type: 'capture-chunk', captureId, text });
          }
          return;
        }
        if (xhr.readyState === 4) {
          void (async () => {
            const body = await decodeXhrBodyAsync(xhr);
            const text = processBytes(new TextEncoder().encode(body));
            post({ type: 'capture-done', captureId, text });
          })();
        }
      });
    }
    return originalXhrSend.apply(this, args);
  };
})();
