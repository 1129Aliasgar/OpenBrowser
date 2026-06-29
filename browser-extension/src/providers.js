const OPENBROWSER_PROVIDERS = {
  chatgpt: {
    name: 'ChatGPT',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    selectors: {
      input: [
        '#prompt-textarea',
        'div.ProseMirror#prompt-textarea[contenteditable="true"]',
        'div.ProseMirror[contenteditable="true"]',
      ],
      send: [
        '#composer-submit-button',
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
      ],
      assistant: [
        '[data-message-author-role="assistant"]',
        'article[data-turn="assistant"]',
      ],
      stop: [
        '[data-testid="stop-button"]',
        'button[aria-label="Stop streaming"]',
        'button[aria-label="Stop generating"]',
      ],
      markdown: ['.markdown', '.markdown-new-styling', '.prose'],
    },
  },
  claude: {
    name: 'Claude',
    hosts: ['claude.ai'],
    selectors: {
      input: [
        'div.ProseMirror[contenteditable="true"]',
        '[data-testid="chat-input"]',
        'div[contenteditable="true"][role="textbox"]',
      ],
      send: [
        'button[aria-label="Send message"]',
        'button[aria-label="Send Message"]',
        'button[aria-label="Send"]',
      ],
      assistant: [
        '[data-testid="assistant-turn"]',
        'div[data-is-streaming]',
        '.font-claude-message',
      ],
      stop: ['button[aria-label="Stop response"]', 'button[aria-label="Stop generating"]'],
      markdown: ['.font-claude-message', '.prose', '.markdown'],
    },
  },
  perplexity: {
    name: 'Perplexity',
    hosts: ['www.perplexity.ai', 'perplexity.ai'],
    selectors: {
      input: [
        'textarea[placeholder*="Ask"]',
        'textarea',
        'div[contenteditable="true"]',
      ],
      send: [
        'button[aria-label="Submit"]',
        'button[data-testid="submit-button"]',
        'button[type="submit"]',
      ],
      assistant: [
        '.prose',
        '[class*="answer"]',
        'main article',
      ],
      stop: ['button[aria-label="Stop"]', 'button[aria-label="Stop generating"]'],
      markdown: ['.prose', '.markdown'],
    },
  },
  glm: {
    name: 'GLM',
    hosts: ['chat.z.ai', 'glm.ai', 'open.bigmodel.cn'],
    selectors: {
      input: [
        'textarea',
        'div[contenteditable="true"]',
        '.ProseMirror[contenteditable="true"]',
      ],
      send: [
        'button[type="submit"]',
        'button[aria-label="Send"]',
        'button.send-btn',
      ],
      assistant: [
        '.message-assistant',
        '[class*="assistant"]',
        '.markdown',
      ],
      stop: ['button[aria-label="Stop"]'],
      markdown: ['.markdown', '.prose'],
    },
  },
  grok: {
    name: 'Grok',
    hosts: ['grok.com', 'x.com'],
    selectors: {
      input: [
        'textarea',
        'div[contenteditable="true"]',
        '.ProseMirror[contenteditable="true"]',
      ],
      send: [
        'button[aria-label="Send"]',
        'button[type="submit"]',
        'button[data-testid="send-button"]',
      ],
      assistant: [
        '[data-testid="message-assistant"]',
        '.message-assistant',
        '.markdown',
      ],
      stop: ['button[aria-label="Stop"]'],
      markdown: ['.markdown', '.prose'],
    },
  },
  gemini: {
    name: 'Gemini',
    hosts: ['gemini.google.com'],
    selectors: {
      input: [
        'div[contenteditable="true"]',
        'textarea',
        '.ql-editor',
      ],
      send: [
        'button[aria-label="Send message"]',
        'button.send-button',
        'button[mattooltip="Send message"]',
      ],
      assistant: [
        '.model-response-text',
        'model-response',
        '.markdown',
      ],
      stop: ['button[aria-label="Stop"]'],
      markdown: ['.markdown', '.model-response-text'],
    },
  },
  deepseek: {
    name: 'DeepSeek',
    hosts: ['chat.deepseek.com'],
    selectors: {
      input: [
        'textarea',
        'div[contenteditable="true"]',
        '.ProseMirror[contenteditable="true"]',
      ],
      send: [
        'button[type="submit"]',
        'button[aria-label="Send"]',
      ],
      assistant: [
        '.ds-markdown',
        '.markdown',
        '[class*="assistant"]',
      ],
      stop: ['button[aria-label="Stop"]'],
      markdown: ['.ds-markdown', '.markdown'],
    },
  },
};

function getProviderForHost(hostname) {
  return (
    Object.values(OPENBROWSER_PROVIDERS).find((provider) =>
      provider.hosts.includes(hostname),
    ) ?? null
  );
}

function queryFirst(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node) {
      return node;
    }
  }
  return null;
}

function queryAll(selectors) {
  for (const selector of selectors) {
    const nodes = [...document.querySelectorAll(selector)];
    if (nodes.length > 0) {
      return nodes;
    }
  }
  return [];
}

function getAllProviderHosts() {
  return Object.values(OPENBROWSER_PROVIDERS).flatMap((provider) => provider.hosts);
}

function getProviderUrlPatterns() {
  return getAllProviderHosts().map((host) => `https://${host}/*`);
}
