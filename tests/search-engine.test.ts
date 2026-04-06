import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../src/text/SearchEngine';
import { WasmBridge } from '../src/core/WasmBridge';
import { WasmLoader } from '../src/core/WasmLoader';
import { PDFDocument } from '../src/document/PDFDocument';
import { createMinimalPDF } from './helpers';
import type { WasmModule } from '../src/types';

describe('SearchEngine', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;
  let engine: SearchEngine;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
    engine = new SearchEngine(wasm, bridge);
  });

  it('returns empty results for empty query', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const results = engine.searchDocument(doc._docPtr, doc.pageCount, '');
    expect(results).toEqual([]);
    doc.close();
  });

  it('searchDocument iterates all pages', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const results = engine.searchDocument(doc._docPtr, doc.pageCount, 'text');
    expect(Array.isArray(results)).toBe(true);
    doc.close();
  });

  it('search results have correct shape', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const results = engine.searchDocument(doc._docPtr, doc.pageCount, 'Sample');

    for (const result of results) {
      expect(result).toHaveProperty('pageIndex');
      expect(result).toHaveProperty('matchIndex');
      expect(result).toHaveProperty('charIndex');
      expect(result).toHaveProperty('charCount');
      expect(result).toHaveProperty('rects');
      expect(result).toHaveProperty('text');
      expect(Array.isArray(result.rects)).toBe(true);
    }

    doc.close();
  });
});
