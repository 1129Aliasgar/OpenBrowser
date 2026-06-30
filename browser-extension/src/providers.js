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
    inject: 'lexical',
    selectors: {
      input: ['#ask-input', 'div[data-lexical-editor="true"]#ask-input'],
      send: [
        'button[aria-label="Submit"]',
        'button[data-testid="submit-button"]',
        'button[type="submit"]',
        'button[aria-label="Send"]',
      ],
      assistant: ['[id^="markdown-content-"]', '.prose[data-renderer="lm"]'],
      stop: ['button[aria-label="Stop"]', 'button[aria-label="Stop generating"]'],
      markdown: ['.prose[data-renderer="lm"]', '[id^="markdown-content-"]'],
    },
  },
  glm: {
    name: 'GLM',
    hosts: ['chat.z.ai', 'glm.ai', 'open.bigmodel.cn'],
    inject: 'textarea',
    selectors: {
      input: ['#chat-input', 'textarea#chat-input'],
      send: [
        'button[type="submit"]',
        'button[aria-label="Send"]',
        'button.send-btn',
        'button[aria-label="Send message"]',
      ],
      assistant: ['.markdown-prose'],
      stop: ['button[aria-label="Stop"]', 'button[aria-label="Stop generating"]'],
      markdown: ['.markdown-prose'],
      exclude: ['.thinking-chain-container'],
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
    inject: 'textarea',
    selectors: {
      input: [
        'textarea#chat-input',
        'textarea[placeholder*="Message DeepSeek"]',
        'textarea[placeholder*="DeepSeek"]',
        'textarea',
        'div[contenteditable="true"]',
        '.ProseMirror[contenteditable="true"]',
      ],
      send: [
        'div.ds-button--primary[role="button"]',
        'div.ds-button.ds-button--primary[role="button"]',
        'input[type="file"] + div[role="button"]',
        'div.ds-chat-input__button[role="button"]',
        'button[aria-label="Send message"]',
        'button[type="submit"]',
        'button[aria-label="Send"]',
      ],
      assistant: [
        '.ds-markdown',
        '.markdown',
        '[data-message-author-role="assistant"]',
        '[class*="assistant"]',
      ],
      stop: [
        'button[aria-label="Stop"]',
        'div.ds-button[role="button"][aria-label*="Stop"]',
      ],
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
