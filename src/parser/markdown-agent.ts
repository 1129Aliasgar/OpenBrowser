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

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

export function extractFileBlocks(markdown: string): MarkdownFileBlock[] {
  const blocks = new Map<string, string>();

  for (const segment of extractOrderedContentSegments(markdown)) {
    if (segment.path) {
      blocks.set(segment.path, segment.content);
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
      const content = (match[2] ?? '').replace(/\n$/, '');
      if (filePath && content.trim() && !isOperationsJson(content)) {
        blocks.set(filePath, content);
      }
    }
  }

  return [...blocks.entries()].map(([path, content]) => ({ path, content }));
}

export function extractOrderedContentSegments(markdown: string): ContentSegment[] {
  const remainder = stripOperationsHeader(markdown).trim();
  if (!remainder) {
    return [];
  }

  const segments: ContentSegment[] = [];
  let pos = 0;

  while (pos < remainder.length) {
    const fenceStart = remainder.indexOf('```', pos);
    if (fenceStart === -1) {
      appendPlainSegments(remainder.slice(pos), segments);
      break;
    }

    if (fenceStart > pos) {
      appendPlainSegments(remainder.slice(pos, fenceStart), segments);
    }

    const lineEnd = remainder.indexOf('\n', fenceStart);
    if (lineEnd === -1) {
      break;
    }

    const tag = remainder.slice(fenceStart + 3, lineEnd).trim();
    const contentStart = lineEnd + 1;
    const fenceEnd = remainder.indexOf('```', contentStart);
    if (fenceEnd === -1) {
      break;
    }

    const content = remainder.slice(contentStart, fenceEnd).replace(/\n$/, '').trim();
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
      const content = body.slice(labeledPath.length).trim();
      if (content) {
        segments.push({ path: labeledPath, content });
        continue;
      }
    }

    if (looksLikeFileContent(body)) {
      segments.push({ content: body });
    }
  }
}

function extractLeadingPathLabel(body: string): string | null {
  const match = new RegExp(`^${PATH_PATTERN}\\s*\\n`, 'i').exec(body);
  return match?.[1] ? normalizePath(match[1]) : null;
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

function stripOperationsHeader(raw: string): string {
  const start = raw.indexOf('{');
  if (start === -1) {
    return raw;
  }

  let depth = 0;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(index + 1);
      }
    }
  }

  return raw.slice(start);
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
  const byPath = new Map(blocks.map((block) => [normalizePath(block.path), block.content]));

  const merged = operations.map((operation) => {
    if (operation.action !== 'CREATE_FILE' && operation.action !== 'EDIT_FILE') {
      return operation;
    }

    if (operation.content?.trim()) {
      return operation;
    }

    const normalized = normalizePath(operation.path ?? '');
    const content = byPath.get(normalized);
    if (!content) {
      return operation;
    }

    return { ...operation, content };
  });

  return mergeSequentialSegments(merged, extractOrderedContentSegments(rawMarkdown));
}

function mergeSequentialSegments<T extends { action: string; path?: string; content?: string }>(
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
    const targetPath = normalizePath(operation.path ?? '');
    const labeledIndex = segments.findIndex(
      (segment, segmentIndex) =>
        !usedSegments.has(segmentIndex) &&
        segment.path !== undefined &&
        normalizePath(segment.path) === targetPath,
    );

    if (labeledIndex !== -1) {
      usedSegments.add(labeledIndex);
      result[index] = { ...operation, content: segments[labeledIndex].content };
      continue;
    }

    const nextIndex = segments.findIndex((_segment, segmentIndex) => !usedSegments.has(segmentIndex));
    if (nextIndex !== -1) {
      usedSegments.add(nextIndex);
      result[index] = { ...operation, content: segments[nextIndex].content };
    }
  }

  return result;
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
        throw new Error(
          `Missing content for ${operation.path}. Add a fenced block: \`\`\`file:${operation.path}\n...\`\`\``,
        );
      }
    }

    if (operation.action === 'EDIT_FILE') {
      if (!hasEditPayload(operation)) {
        throw new Error(
          `Missing content for ${operation.path}. Use \`\`\`file:${operation.path}\`\`\` with full content, or startLine/endLine/replace for partial edits on existing files.`,
        );
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
