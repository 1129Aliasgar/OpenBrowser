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
      attachButton: [
        'button[data-testid="composer-plus-btn"]',
        'button.composer-btn[data-testid="composer-plus-btn"]',
        'button[aria-label="Add files and more"]',
        'button[aria-label="Attach files"]',
        'button[aria-label="Add photos & files"]',
      ],
      attachMenuText: [
        'add photos & files',
        'add photos and files',
        'upload file',
        'attach file',
        'add files',
        'files',
      ],
      fileInput: [
        'input[type="file"]',
        'input[type="file"][accept]',
        'input[type="file"]:not([disabled])',
      ],
      attachmentPreview: [
        '[data-testid="file-name"]',
        '[data-testid="attachment-preview"]',
        '.f3a54b52',
        '._76cd190',
        'uploader-file-preview',
        'gem-attachment',
      ],
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
      attachButton: ['button[aria-label="Upload files"]', 'button[aria-label="Attach files"]'],
      fileInput: ['input[type="file"]'],
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
      attachButton: [
        'button[aria-label*="Attach" i]',
        'button[aria-label*="Upload" i]',
        'button[aria-label*="paperclip" i]',
        '[data-testid="attach-button"]',
        '[data-testid="file-upload-button"]',
      ],
      attachMenuText: [
        'upload files or images',
        'upload files',
        'upload file',
        'attach file',
        'files',
      ],
      fileInput: ['input[type="file"]'],
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
      attachButton: [
        'button[aria-label="Open upload file menu"]',
        'button.upload-card-button',
        'button[aria-label*="Upload" i]',
        'button[aria-label*="Attach" i]',
        'button[aria-label="Add files"]',
        '.leading-actions-wrapper button',
        'mat-icon[data-mat-icon-name="add_2"]',
      ],
      attachMenuText: ['files', 'upload file', 'add file', 'attach file', 'from device'],
      attachMenuSelectors: [
        '[data-test-id="uploader-images-files-button-advanced"] button',
        'images-files-uploader button.mat-mdc-button',
        'images-files-uploader gem-button button',
        '.upload-menu-item button',
        'button.hidden-local-file-image-selector-button',
        'button[xapfileselectortrigger]',
      ],
      fileInput: [
        'images-files-uploader input[type="file"]',
        'input[type="file"]',
        'input[type="file"][accept]',
      ],
      attachmentPreview: [
        'gem-attachment',
        'uploader-file-preview',
        '.gem-attachment',
        'mat-basic-chip.gem-attachment',
        '.gem-attachment-extension-label',
      ],
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
      attachButton: [
        'div.ds-button.ds-button--iconLabelPrimary.ds-button--icon.ds-button--capsule[role="button"]',
        'div.ds-button.ds-button--icon.ds-button--capsule.ds-button--s[role="button"]',
        'input[type="file"] + div[role="button"]',
        'button[aria-label="Upload"]',
        'button[aria-label*="upload" i]',
        'button[aria-label*="attach" i]',
      ],
      attachMenuText: ['upload', 'attach', 'file'],
      fileInput: [
        'input[type="file"]',
        'input[type="file"][accept]',
      ],
      attachmentPreview: [
        '.f3a54b52',
        '._76cd190',
        '._5119742',
        '._75e1990 .f3a54b52',
      ],
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

function collectSearchRoots(root = document) {
  const roots = [root];
  const elements = root.querySelectorAll?.('*') ?? [];

  for (const element of elements) {
    if (element.shadowRoot) {
      roots.push(...collectSearchRoots(element.shadowRoot));
    }
  }

  return roots;
}

function queryFirst(selectors, root = document) {
  for (const selector of selectors) {
    const node = root.querySelector?.(selector);
    if (node) {
      return node;
    }
  }

  for (const shadowRoot of collectSearchRoots(root)) {
    if (shadowRoot === root) {
      continue;
    }

    for (const selector of selectors) {
      const node = shadowRoot.querySelector?.(selector);
      if (node) {
        return node;
      }
    }
  }

  return null;
}

function queryAll(selectors, root = document) {
  for (const selector of selectors) {
    const nodes = [...(root.querySelectorAll?.(selector) ?? [])];
    if (nodes.length > 0) {
      return nodes;
    }
  }

  for (const shadowRoot of collectSearchRoots(root)) {
    if (shadowRoot === root) {
      continue;
    }

    for (const selector of selectors) {
      const nodes = [...(shadowRoot.querySelectorAll?.(selector) ?? [])];
      if (nodes.length > 0) {
        return nodes;
      }
    }
  }

  return [];
}

function findClickableByText(texts, root = document) {
  const normalizedTexts = texts.map((text) => text.toLowerCase());
  const roots = [root, ...collectSearchRoots(root).filter((item) => item !== root)];

  for (const searchRoot of roots) {
    const candidates = searchRoot.querySelectorAll?.(
      'button, [role="menuitem"], [role="button"], [role="option"], div[tabindex], span[tabindex], span.gds-body-l, span.gds-body-m',
    ) ?? [];

    for (const candidate of candidates) {
      const label = `${candidate.textContent ?? ''} ${candidate.getAttribute('aria-label') ?? ''}`
        .trim()
        .toLowerCase();

      if (!label) {
        continue;
      }

      if (normalizedTexts.some((text) => label.includes(text))) {
        return candidate.closest('button, [role="menuitem"], [role="button"]') ?? candidate;
      }
    }
  }

  return null;
}

function clickElement(element) {
  if (!element) {
    return false;
  }

  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.click();
  return true;
}

function getAllProviderHosts() {
  return Object.values(OPENBROWSER_PROVIDERS).flatMap((provider) => provider.hosts);
}

function getProviderUrlPatterns() {
  return getAllProviderHosts().map((host) => `https://${host}/*`);
}
