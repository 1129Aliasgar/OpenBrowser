import { describe, expect, it } from 'vitest';
import {
  extractFileBlocks,
  extractOrderedContentSegments,
  mergeFileBlocksIntoOperations,
} from './markdown-agent.js';

describe('extractOrderedContentSegments', () => {
  it('parses operations JSON then bare package.json and plain JS in order', () => {
    const raw = `{
  "operations": [
    { "action": "CREATE_FILE", "path": "package.json" },
    { "action": "CREATE_FILE", "path": "src/server.js" }
  ],
  "conversationId": "98d00fcd-6722-45a3-a3a4-f0eedcf1cc9a"
}

{
  "name": "express-app",
  "version": "1.0.0"
}

const express = require('express');
module.exports = express;`;

    const segments = extractOrderedContentSegments(raw);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.content).toContain('"name": "express-app"');
    expect(segments[1]?.content).toContain("require('express')");
  });
});

describe('mergeFileBlocksIntoOperations', () => {
  it('maps sequential segments to CREATE_FILE operations', () => {
    const raw = `{
  "operations": [
    { "action": "CREATE_FILE", "path": "package.json" },
    { "action": "CREATE_FILE", "path": "src/server.js" }
  ],
  "conversationId": "98d00fcd-6722-45a3-a3a4-f0eedcf1cc9a"
}

{ "name": "app" }

const app = 1;`;

    const operations = [
      { action: 'CREATE_FILE', path: 'package.json' },
      { action: 'CREATE_FILE', path: 'src/server.js' },
    ];

    const merged = mergeFileBlocksIntoOperations(operations, extractFileBlocks(raw), raw);
    expect(merged[0]?.content).toContain('"name": "app"');
    expect(merged[1]?.content).toContain('const app = 1');
  });

  it('extracts ```file:path``` blocks', () => {
    const raw = '```file:src/server.js\nconst x = 1;\n```';
    expect(extractFileBlocks(raw)).toEqual([
      { path: 'src/server.js', content: 'const x = 1;' },
    ]);
  });
});
