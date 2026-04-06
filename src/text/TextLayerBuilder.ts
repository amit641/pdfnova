import type { WasmModule, CharBox, TextSpan } from '../types';
import { WasmBridge } from '../core/WasmBridge';
import { TextExtractor } from './TextExtractor';

/**
 * Generates a positioned DOM text layer over a rendered PDF page.
 * Uses character-level bounding boxes for pixel-perfect text selection and copy-paste.
 */
export class TextLayerBuilder {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  /**
   * Build a text layer DOM structure inside the given container.
   * Spans are absolutely positioned to match the rendered PDF pixels.
   *
   * @param textPagePtr - PDFium text page handle
   * @param container - DOM element to append text layer into
   * @param pageWidth - PDF page width in points
   * @param pageHeight - PDF page height in points
   * @param scale - Rendering scale factor (default 1.0)
   */
  build(
    textPagePtr: number,
    container: HTMLElement,
    pageWidth: number,
    pageHeight: number,
    scale: number = 1.0,
  ): HTMLElement {
    const layer = document.createElement('div');
    layer.className = 'pdfnova-text-layer';
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${pageWidth * scale}px;
      height: ${pageHeight * scale}px;
      overflow: hidden;
      opacity: 0.25;
      line-height: 1;
      pointer-events: all;
    `;

    const extractor = new TextExtractor(this.wasm, this.bridge);
    const spans = extractor.extractSpans(textPagePtr);

    for (const span of spans) {
      const el = this._createSpanElement(span, pageHeight, scale);
      layer.appendChild(el);
    }

    container.appendChild(layer);
    return layer;
  }

  /**
   * Build a text layer using character-level positioning for maximum accuracy.
   * Slower but pixel-perfect — use when precise text selection is critical.
   */
  buildCharLevel(
    textPagePtr: number,
    container: HTMLElement,
    pageWidth: number,
    pageHeight: number,
    scale: number = 1.0,
  ): HTMLElement {
    const layer = document.createElement('div');
    layer.className = 'pdfnova-text-layer pdfnova-text-layer--char-level';
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${pageWidth * scale}px;
      height: ${pageHeight * scale}px;
      overflow: hidden;
      opacity: 0.25;
      line-height: 1;
      pointer-events: all;
    `;

    const extractor = new TextExtractor(this.wasm, this.bridge);
    const charBoxes = extractor.extractCharBoxes(textPagePtr);

    // Group chars into runs on the same line for better copy-paste
    const runs = this._groupIntoRuns(charBoxes);

    for (const run of runs) {
      const runEl = document.createElement('span');
      runEl.style.cssText = `
        position: absolute;
        left: ${run[0].left * scale}px;
        top: ${(pageHeight - run[0].top) * scale}px;
        font-size: ${run[0].fontSize * scale}px;
        font-family: sans-serif;
        white-space: pre;
        transform-origin: 0% 0%;
      `;

      let text = '';
      for (const box of run) {
        text += box.char;
      }
      runEl.textContent = text;

      // Calculate scaleX to match the exact width PDFium computed
      const firstBox = run[0];
      const lastBox = run[run.length - 1];
      const expectedWidth = (lastBox.right - firstBox.left) * scale;
      if (expectedWidth > 0 && runEl.textContent.length > 0) {
        runEl.dataset.expectedWidth = String(expectedWidth);
      }

      layer.appendChild(runEl);
    }

    container.appendChild(layer);
    return layer;
  }

  private _createSpanElement(span: TextSpan, pageHeight: number, scale: number): HTMLElement {
    const el = document.createElement('span');

    // PDF coordinate system: origin at bottom-left, Y goes up
    // DOM coordinate system: origin at top-left, Y goes down
    const domX = span.x * scale;
    const domY = (pageHeight - span.y - span.height) * scale;
    const fontSize = span.fontSize * scale;

    el.textContent = span.text;
    el.style.cssText = `
      position: absolute;
      left: ${domX}px;
      top: ${domY}px;
      font-size: ${fontSize}px;
      font-family: sans-serif;
      white-space: pre;
      transform-origin: 0% 0%;
    `;

    el.dataset.charIndex = String(span.charIndex);
    el.dataset.charCount = String(span.charCount);

    return el;
  }

  private _groupIntoRuns(boxes: CharBox[]): CharBox[][] {
    if (boxes.length === 0) return [];

    const runs: CharBox[][] = [];
    let currentRun: CharBox[] = [boxes[0]];

    for (let i = 1; i < boxes.length; i++) {
      const prev = boxes[i - 1];
      const curr = boxes[i];

      const sameLine = Math.abs(prev.bottom - curr.bottom) < prev.fontSize * 0.5;
      const gap = curr.left - prev.right;
      const tooFar = gap > prev.fontSize * 2;

      if (sameLine && !tooFar) {
        currentRun.push(curr);
      } else {
        if (currentRun.length > 0) runs.push(currentRun);
        currentRun = [curr];
      }
    }

    if (currentRun.length > 0) runs.push(currentRun);
    return runs;
  }
}
