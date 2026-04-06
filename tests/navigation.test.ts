import { describe, it, expect, beforeEach } from 'vitest';
import { OutlineExtractor } from '../src/navigation/OutlineExtractor';
import { LinkExtractor } from '../src/navigation/LinkExtractor';
import { WasmBridge } from '../src/core/WasmBridge';
import { WasmLoader } from '../src/core/WasmLoader';
import { PDFDocument } from '../src/document/PDFDocument';
import { createMinimalPDF } from './helpers';
import type { WasmModule } from '../src/types';

describe('OutlineExtractor', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
  });

  it('extracts outline as array', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const extractor = new OutlineExtractor(wasm, bridge);
    const outline = extractor.extract(doc._docPtr);

    expect(Array.isArray(outline)).toBe(true);
    doc.close();
  });
});

describe('LinkExtractor', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
  });

  it('extracts links as array', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    const links = page.getLinks();
    expect(Array.isArray(links)).toBe(true);

    doc.close();
  });
});
