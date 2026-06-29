export interface MarkdownFileBlock {
  path: string;
  content: string;
}

export interface ContentSegment {
  path?: string;
  content: string;
}

const PATH_PATTERN = '([a-zA-Z0-9_./-]+\\.[a-zA-Z0-9]+)';
const PATH_FILE_RE = /[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+/;
const OB_FILE_BEGIN = '---OB_FILE_BEGIN:';
const OB_FILE_END = '---OB_FILE_END---';
/** Path may include hyphens; newline after BEGIN delimiter is optional (Perplexity inline prose). */
const OB_FILE_BLOCK_RE =
  /---OB_FILE_BEGIN:\s*([^\n]+?)---\s*([\s\S]*?)---OB_FILE_END---/gi;

/** Detect markdown code fences when the model should use OB_FILE blocks. */
export function detectCopyPasteBlocks(
  raw: string,
  options: { allowMarkdownFences?: boolean } = {},
): string | null {
  if (!/```/.test(raw)) {
    return null;
  }

  if (/---OB_FILE_BEGIN:/i.test(raw)) {
    return null;
  }

  if (options.allowMarkdownFences && hasMarkdownFence(raw)) {
    return null;
  }

  return [
    'You used markdown code fences (```). For code files use OB_FILE blocks.',
    `For .md files use ONE \`\`\`markdown ... \`\`\` block. For .js/.json use ${OB_FILE_BEGIN} ... ${OB_FILE_END}.`,
    'Do NOT use file attachment UI, canvas, or copy-code widgets.',
  ].join(' ');
}

export function isMarkdownPath(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(normalizePath(filePath));
}

export function hasMarkdownFence(raw: string): boolean {
  return (
    /```(?:markdown|md)\s*\n/i.test(raw) ||
    /```file:[^\n`]+\.md[\s\n]/i.test(raw) ||
    /```\n#\s/m.test(raw)
  );
}

export function extractMarkdownFenceBlocks(markdown: string): MarkdownFileBlock[] {
  const blocks: MarkdownFileBlock[] = [];

  for (const match of markdown.matchAll(/```file:([^\n`]+\.md)\s*\n([\s\S]*?)```/gi)) {
    const path = normalizePath(match[1] ?? '');
    const content = normalizeMultilineText((match[2] ?? '').trim());
    if (path && content && !isOperationsJson(content)) {
      blocks.push({ path, content });
    }
  }

  for (const match of markdown.matchAll(/```(?:markdown|md)\s*\n([\s\S]*?)```/gi)) {
    const content = normalizeMultilineText((match[1] ?? '').trim());
    if (content && !isOperationsJson(content)) {
      blocks.push({ path: '', content });
    }
  }

  return blocks;
}

export function extractPrimaryMarkdownFence(raw: string): string | null {
  const blocks = extractMarkdownFenceBlocks(raw);
  if (blocks.length === 0) {
    return null;
  }

  const best = blocks.reduce((longest, block) =>
    block.content.length > longest.content.length ? block : longest,
  );
  return best.content;
}

export function extractMarkdownDraftContent(raw: string): string | null {
  const fromFence = extractPrimaryMarkdownFence(raw);
  if (fromFence) {
    return fromFence;
  }

  const trimmed = raw.trim();
  if (/^#\s/m.test(trimmed) && trimmed.length > 40) {
    return trimmed;
  }

  return null;
}

export function operationsNeedMarkdownContent(
  operations: { action: string; path?: string; content?: string }[],
): boolean {
  return operations.some(
    (operation) =>
      (operation.action === 'CREATE_FILE' || operation.action === 'EDIT_FILE') &&
      isMarkdownPath(operation.path ?? '') &&
      !operation.content?.trim(),
  );
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function pathKey(filePath: string): string {
  return normalizePath(filePath).toLowerCase();
}

/** Parse `file:src/foo.js` or bare `src/foo.js` from a label line. */
export function extractFilePathLabel(text: string): string | null {
  const trimmed = text.trim();
  const filePrefix = /^file:\s*(\S+)/i.exec(trimmed);
  if (filePrefix?.[1]) {
    return normalizePath(filePrefix[1]);
  }

  const match = new RegExp(`^${PATH_PATTERN}$`, 'i').exec(trimmed);
  if (match?.[1]) {
    return normalizePath(match[1]);
  }

  const embedded = new RegExp(PATH_PATTERN).exec(trimmed);
  return embedded?.[1] ? normalizePath(embedded[1]) : null;
}

/** Build capture text like the extension sends after reading labeled LLM file blocks. */
export function buildLlmCaptureText(parts: {
  operationsJson: string;
  files: { path: string; content: string }[];
}): string {
  const blocks = parts.files.map(
    (file) => `${OB_FILE_BEGIN} ${file.path}---\n${file.content.trim()}\n${OB_FILE_END}`,
  );
  return [parts.operationsJson.trim(), ...blocks].join('\n\n');
}

export function normalizeObFileCaptureText(raw: string): string {
  const blocks = extractObFileBlocks(raw);
  if (blocks.length === 0) {
    return raw;
  }

  const beginIndex = raw.search(/---OB_FILE_BEGIN:/i);
  const prefix = beginIndex > 0 ? raw.slice(0, beginIndex).trim() : '';
  const serialized = blocks.map(
    (block) => `${OB_FILE_BEGIN} ${block.path}---\n${block.content.trim()}\n${OB_FILE_END}`,
  );

  return [prefix, ...serialized].filter(Boolean).join('\n\n');
}

export function extractObFileBlocks(markdown: string): MarkdownFileBlock[] {
  const blocks = new Map<string, MarkdownFileBlock>();

  for (const match of markdown.matchAll(OB_FILE_BLOCK_RE)) {
    const filePath = normalizePath(match[1] ?? '');
    const content = normalizeMultilineText((match[2] ?? '').replace(/\n$/, '').trim());
    if (filePath && content && !isOperationsJson(content)) {
      blocks.set(pathKey(filePath), { path: filePath, content });
    }
  }

  return [...blocks.values()];
}

/** Unescape literal \\n / \\t sequences and normalize line endings. */
export function normalizeMultilineText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
}

export function extractFileBlocks(markdown: string): MarkdownFileBlock[] {
  const blocks = new Map<string, MarkdownFileBlock>();

  for (const block of extractObFileBlocks(markdown)) {
    blocks.set(pathKey(block.path), block);
  }

  for (const block of extractMarkdownFenceBlocks(markdown)) {
    if (block.path) {
      blocks.set(pathKey(block.path), block);
    }
  }

  for (const segment of extractOrderedContentSegments(markdown)) {
    if (segment.path) {
      const path = normalizePath(segment.path);
      blocks.set(pathKey(path), { path, content: segment.content });
    }
  }

  const patterns = [
    /```file:([^\n`]+)\n([\s\S]*?)```/gi,
    new RegExp(`\`\`\`${PATH_PATTERN}\\n([\\s\\S]*?)\`\`\``, 'gi'),
    new RegExp(
      `(?:^|\\n)(?:#{1,6}\\s*|\\*\\*|__)?${PATH_PATTERN}(?:\\*\\*|__)?\\s*\\n+\`\`\`[\\w.-]*\\n([\\s\\S]*?)\`\`\``,
      'gi',
    ),
    new RegExp(
      `(?:^|\\n)${PATH_PATTERN}\\s*\\n+\`\`\`[\\w.-]*\\n([\\s\\S]*?)\`\`\``,
      'gi',
    ),
  ];

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const filePath = normalizePath(match[1] ?? '');
      const content = normalizeMultilineText((match[2] ?? '').replace(/\n$/, ''));
      if (filePath && content.trim() && !isOperationsJson(content)) {
        blocks.set(pathKey(filePath), { path: filePath, content });
      }
    }
  }

  return [...blocks.values()];
}

export function extractOrderedContentSegments(markdown: string): ContentSegment[] {
  const remainder = stripAllOperationsJson(markdown).trim();
  if (!remainder) {
    return [];
  }

  const segments: ContentSegment[] = [];

  for (const block of extractObFileBlocks(remainder)) {
    segments.push({ path: block.path, content: block.content });
  }

  const scanText = stripObFileBlocks(remainder);
  let pos = 0;

  while (pos < scanText.length) {
    const fenceStart = scanText.indexOf('```', pos);
    if (fenceStart === -1) {
      appendPlainSegments(scanText.slice(pos), segments);
      break;
    }

    if (fenceStart > pos) {
      const prefix = scanText.slice(pos, fenceStart).trim();
      const prefixPath = extractPrefixPathLabel(prefix);
      if (prefixPath) {
        pos = fenceStart;
        const lineEnd = scanText.indexOf('\n', fenceStart);
        if (lineEnd === -1) {
          break;
        }
        const contentStart = lineEnd + 1;
        const fenceEnd = scanText.indexOf('```', contentStart);
        if (fenceEnd === -1) {
          break;
        }
        const content = normalizeMultilineText(
          scanText.slice(contentStart, fenceEnd).replace(/\n$/, '').trim(),
        );
        if (content && !isOperationsJson(content)) {
          segments.push({ path: prefixPath, content });
        }
        pos = fenceEnd + 3;
        continue;
      }

      appendPlainSegments(prefix, segments);
    }

    const lineEnd = scanText.indexOf('\n', fenceStart);
    if (lineEnd === -1) {
      break;
    }

    const tag = scanText.slice(fenceStart + 3, lineEnd).trim();
    const contentStart = lineEnd + 1;
    const fenceEnd = scanText.indexOf('```', contentStart);
    if (fenceEnd === -1) {
      break;
    }

    const content = normalizeMultilineText(
      scanText.slice(contentStart, fenceEnd).replace(/\n$/, '').trim(),
    );
    if (content && !isOperationsJson(content)) {
      let path: string | undefined;
      if (tag.startsWith('file:')) {
        path = normalizePath(tag.slice(5));
      } else if (PATH_FILE_RE.test(tag)) {
        path = normalizePath(tag);
      }

      segments.push({ path, content });
    }

    pos = fenceEnd + 3;
  }

  return segments;
}

function stripObFileBlocks(text: string): string {
  return text.replace(OB_FILE_BLOCK_RE, '').trim();
}

function appendPlainSegments(text: string, segments: ContentSegment[]): void {
  const trimmed = text.trim();
  if (!trimmed || isOperationsJson(trimmed)) {
    return;
  }

  const pathLabelMatch = new RegExp(`^(${PATH_PATTERN})\\s*$`, 'im').exec(trimmed);
  if (pathLabelMatch && trimmed.split('\n').length === 1) {
    return;
  }

  const chunks = trimmed.split(/\n{2,}/);
  for (const chunk of chunks) {
    const body = chunk.trim();
    if (!body || isOperationsJson(body)) {
      continue;
    }

    const labeledPath = extractLeadingPathLabel(body);
    if (labeledPath) {
      const content = normalizeMultilineText(body.slice(labeledPath.length).trim());
      if (content) {
        segments.push({ path: labeledPath, content });
        continue;
      }
    }

    if (looksLikeFileContent(body)) {
      segments.push({ content: normalizeMultilineText(body) });
    }
  }
}

function extractLeadingPathLabel(body: string): string | null {
  const fileLine = extractFilePathLabel(body.split('\n')[0] ?? body);
  if (fileLine && /^file:\s*\S+/i.test(body)) {
    return fileLine;
  }

  const match = new RegExp(`^${PATH_PATTERN}\\s*\\n`, 'i').exec(body);
  return match?.[1] ? normalizePath(match[1]) : null;
}

function extractPrefixPathLabel(prefix: string): string | null {
  if (!prefix) {
    return null;
  }

  const lines = prefix.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) {
    return null;
  }

  const path = extractFilePathLabel(lines[0] ?? '');
  if (!path) {
    return null;
  }

  const line = lines[0] ?? '';
  return /^file:\s*\S+/i.test(line) || line === path ? path : null;
}

function looksLikeFileContent(body: string): boolean {
  if (body.startsWith('{') && body.endsWith('}')) {
    try {
      JSON.parse(body);
      return true;
    } catch {
      return false;
    }
  }

  return /^(const |import |export |module\.exports|require\(|function |class |\/\/|\/\*)/m.test(body);
}

function stripAllOperationsJson(raw: string): string {
  let text = raw;
  let block = findOperationsJsonBlock(text, 0);

  while (block) {
    text = `${text.slice(0, block.start)}${text.slice(block.end)}`;
    block = findOperationsJsonBlock(text, 0);
  }

  return text;
}

function findOperationsJsonBlock(
  text: string,
  fromIndex: number,
): { start: number; end: number } | null {
  const start = text.indexOf('{', fromIndex);
  if (start === -1) {
    return null;
  }

  const json = extractBalancedJson(text, start);
  if (!json || !isOperationsJson(json)) {
    return findOperationsJsonBlock(text, start + 1);
  }

  return { start, end: start + json.length };
}

function extractBalancedJson(text: string, start: number): string | null {
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

  return null;
}

function isOperationsJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed) as { operations?: unknown };
    return Array.isArray(parsed.operations);
  } catch {
    return trimmed.includes('"operations"');
  }
}

export function mergeFileBlocksIntoOperations<
  T extends { action: string; path?: string; content?: string },
>(operations: T[], blocks: MarkdownFileBlock[], rawMarkdown = ''): T[] {
  const byPath = new Map(blocks.map((block) => [pathKey(block.path), block.content]));

  const merged = operations.map((operation) => {
    if (operation.action !== 'CREATE_FILE' && operation.action !== 'EDIT_FILE') {
      return operation;
    }

    if (operation.content?.trim()) {
      return {
        ...operation,
        content: normalizeMultilineText(operation.content),
      };
    }

    const normalized = pathKey(operation.path ?? '');
    const content = byPath.get(normalized);
    if (!content) {
      return operation;
    }

    return { ...operation, content };
  });

  return mergePathMatchedSegments(merged, extractOrderedContentSegments(rawMarkdown));
}

export function mergeMarkdownFencesIntoOperations<
  T extends { action: string; path?: string; content?: string },
>(operations: T[], rawMarkdown: string): T[] {
  const unlabeled = extractMarkdownFenceBlocks(rawMarkdown)
    .filter((block) => !block.path)
    .map((block) => block.content);

  if (unlabeled.length === 0) {
    return operations;
  }

  const pendingMd = operations
    .map((operation, index) => ({ operation, index }))
    .filter(
      ({ operation }) =>
        (operation.action === 'CREATE_FILE' || operation.action === 'EDIT_FILE') &&
        isMarkdownPath(operation.path ?? '') &&
        !operation.content?.trim(),
    );

  if (pendingMd.length === 0) {
    return operations;
  }

  const result = [...operations];
  const sortedFences = [...unlabeled].sort((a, b) => b.length - a.length);

  if (sortedFences.length === 1) {
    for (const { operation, index } of pendingMd) {
      result[index] = { ...operation, content: sortedFences[0]! };
    }
    return result;
  }

  for (let i = 0; i < pendingMd.length && i < sortedFences.length; i += 1) {
    const { operation, index } = pendingMd[i]!;
    result[index] = { ...operation, content: sortedFences[i]! };
  }

  return result;
}

function mergePathMatchedSegments<T extends { action: string; path?: string; content?: string }>(
  operations: T[],
  segments: ContentSegment[],
): T[] {
  const pendingOps = operations
    .map((operation, index) => ({ operation, index }))
    .filter(
      ({ operation }) =>
        (operation.action === 'CREATE_FILE' || operation.action === 'EDIT_FILE') &&
        !operation.content?.trim(),
    );

  if (pendingOps.length === 0 || segments.length === 0) {
    return operations;
  }

  const usedSegments = new Set<number>();
  const result = [...operations];

  for (const { operation, index } of pendingOps) {
    const targetPath = pathKey(operation.path ?? '');
    const labeledIndex = segments.findIndex(
      (segment, segmentIndex) =>
        !usedSegments.has(segmentIndex) &&
        segment.path !== undefined &&
        pathKey(segment.path) === targetPath,
    );

    if (labeledIndex !== -1) {
      usedSegments.add(labeledIndex);
      result[index] = { ...operation, content: segments[labeledIndex].content };
    }
  }

  const stillPending = pendingOps.filter(({ index }) => !result[index]?.content?.trim());
  const unlabeled = segments
    .map((segment, segmentIndex) => ({ segment, segmentIndex }))
    .filter(
      ({ segment, segmentIndex }) => !usedSegments.has(segmentIndex) && segment.path === undefined,
    );

  if (stillPending.length > 0 && stillPending.length === unlabeled.length) {
    for (let i = 0; i < stillPending.length; i += 1) {
      const { operation, index } = stillPending[i]!;
      const segment = unlabeled[i]!.segment;
      result[index] = { ...operation, content: segment.content };
    }
  }

  return result;
}

export function normalizeOperationTextFields<
  T extends {
    content?: string;
    search?: string;
    replace?: string;
  },
>(operations: T[]): T[] {
  return operations.map((operation) => ({
    ...operation,
    content: operation.content !== undefined ? normalizeMultilineText(operation.content) : undefined,
    search: operation.search !== undefined ? normalizeMultilineText(operation.search) : undefined,
    replace: operation.replace !== undefined ? normalizeMultilineText(operation.replace) : undefined,
  }));
}

export function validateMergedFileOperations(
  operations: {
    action: string;
    path?: string;
    content?: string;
    command?: string;
    search?: string;
    replace?: string;
    startLine?: number;
    endLine?: number;
  }[],
): void {
  for (const operation of operations) {
    if (operation.action === 'CREATE_FILE') {
      if (!operation.content?.trim()) {
        const mdHint = isMarkdownPath(operation.path ?? '')
          ? 'Add ONE ```markdown ... ``` fenced block with full raw markdown source after the JSON.'
          : `Add an OpenBrowser file block: ${OB_FILE_BEGIN} ${operation.path}--- ... ${OB_FILE_END} (path must match exactly).`;
        throw new Error(`Missing content for ${operation.path}. ${mdHint}`);
      }
    }

    if (operation.action === 'EDIT_FILE') {
      if (!hasEditPayload(operation)) {
        const mdHint = isMarkdownPath(operation.path ?? '')
          ? 'Use a ```markdown ... ``` block with full content, or startLine/endLine/replace for partial edits.'
          : `Use ${OB_FILE_BEGIN} ${operation.path}--- with full content, or startLine/endLine/replace for partial edits.`;
        throw new Error(`Missing content for ${operation.path}. ${mdHint}`);
      }
    }

    if (operation.action === 'RUN_COMMAND' && !operation.command?.trim()) {
      throw new Error('RUN_COMMAND requires a non-empty command string');
    }
  }
}

function hasEditPayload(operation: {
  content?: string;
  search?: string;
  replace?: string;
  startLine?: number;
  endLine?: number;
}): boolean {
  if (operation.content?.trim()) {
    return true;
  }

  if (operation.search !== undefined && operation.replace !== undefined) {
    return true;
  }

  if (
    operation.startLine !== undefined &&
    operation.endLine !== undefined &&
    operation.replace !== undefined
  ) {
    return true;
  }

  return false;
}
