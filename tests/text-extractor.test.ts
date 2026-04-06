import { describe, it, expect, beforeEach } from 'vitest';
import { TextExtractor } from '../src/text/TextExtractor';
import { WasmBridge } from '../src/core/WasmBridge';
import { WasmLoader } from '../src/core/WasmLoader';
import type { WasmModule } from '../src/types';

describe('TextExtractor', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;
  let extractor: TextExtractor;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
    extractor = new TextExtractor(wasm, bridge);
  });

  it('extracts text from a text page', () => {
    // Load a document and page to get a text page pointer
    const pdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n0\n%%EOF');
    const dataPtr = wasm._malloc(pdf.length);
    wasm.HEAPU8.set(pdf, dataPtr);

    const docPtr = wasm._FPDF_LoadMemDocument(dataPtr, pdf.length, 0);
    expect(docPtr).toBeGreaterThan(0);

    const pagePtr = wasm._FPDF_LoadPage(docPtr, 0);
    expect(pagePtr).toBeGreaterThan(0);

    const textPagePtr = wasm._FPDFText_LoadPage(pagePtr);
    expect(textPagePtr).toBeGreaterThan(0);

    const text = extractor.extractText(textPagePtr);
    expect(typeof text).toBe('string');

    const charBoxes = extractor.extractCharBoxes(textPagePtr);
    expect(Array.isArray(charBoxes)).toBe(true);

    const spans = extractor.extractSpans(textPagePtr);
    expect(Array.isArray(spans)).toBe(true);

    wasm._FPDFText_ClosePage(textPagePtr);
    wasm._FPDF_ClosePage(pagePtr);
    wasm._FPDF_CloseDocument(docPtr);
    wasm._free(dataPtr);
  });
});
