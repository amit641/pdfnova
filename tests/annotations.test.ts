import { describe, it, expect, beforeEach } from 'vitest';
import { setTier } from '../src/capabilities';
import { AnnotationReader } from '../src/annotations/AnnotationReader';
import { AnnotationWriter } from '../src/annotations/AnnotationWriter';
import { WasmBridge } from '../src/core/WasmBridge';
import { WasmLoader } from '../src/core/WasmLoader';
import { PDFDocument } from '../src/document/PDFDocument';
import { AnnotationType } from '../src/types';
import { createMinimalPDF } from './helpers';
import type { WasmModule } from '../src/types';

describe('Annotations (full tier)', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;

  beforeEach(async () => {
    WasmLoader.reset();
    setTier('full');
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
  });

  it('AnnotationReader reads annotations from a page', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    const reader = new AnnotationReader(wasm, bridge);
    // Access internal page pointer via the page's render
    const annotations = await page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);

    doc.close();
  });

  it('AnnotationWriter creates an annotation', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    await page.addAnnotation({
      type: AnnotationType.Highlight,
      rect: { left: 72, top: 720, right: 300, bottom: 700 },
      color: { r: 255, g: 235, b: 59, a: 128 },
    });

    doc.close();
  });

  it('throws on lite tier', async () => {
    setTier('lite');
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    await expect(page.getAnnotations()).rejects.toThrow(/full build/);
    doc.close();
  });
});
