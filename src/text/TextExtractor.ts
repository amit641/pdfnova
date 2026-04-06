import type { WasmModule, TextSpan, CharBox } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Extracts text content from a PDF page with character-level bounding boxes.
 * Uses FPDFText_* APIs for precise glyph positioning.
 */
export class TextExtractor {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  extractText(textPagePtr: number): string {
    const charCount = this.wasm._FPDFText_CountChars(textPagePtr);
    if (charCount <= 0) return '';

    const bufSize = (charCount + 1) * 2;
    const buf = this.wasm._malloc(bufSize);
    this.wasm._FPDFText_GetText(textPagePtr, 0, charCount, buf);
    const text = this.bridge.readUTF16String(buf);
    this.wasm._free(buf);

    return text;
  }

  extractCharBoxes(textPagePtr: number): CharBox[] {
    const charCount = this.wasm._FPDFText_CountChars(textPagePtr);
    if (charCount <= 0) return [];

    const leftPtr = this.bridge.allocateF64();
    const rightPtr = this.bridge.allocateF64();
    const bottomPtr = this.bridge.allocateF64();
    const topPtr = this.bridge.allocateF64();

    const boxes: CharBox[] = [];

    try {
      for (let i = 0; i < charCount; i++) {
        const unicode = this.wasm._FPDFText_GetUnicode(textPagePtr, i);
        if (unicode === 0) continue;

        const result = this.wasm._FPDFText_GetCharBox(
          textPagePtr, i,
          leftPtr, rightPtr, bottomPtr, topPtr,
        );

        if (result) {
          boxes.push({
            char: String.fromCodePoint(unicode),
            charCode: unicode,
            left: this.bridge.readF64(leftPtr),
            right: this.bridge.readF64(rightPtr),
            bottom: this.bridge.readF64(bottomPtr),
            top: this.bridge.readF64(topPtr),
            fontSize: this.wasm._FPDFText_GetFontSize(textPagePtr, i),
            index: i,
          });
        }
      }
    } finally {
      this.bridge.freeAll(leftPtr, rightPtr, bottomPtr, topPtr);
    }

    return boxes;
  }

  /**
   * Groups consecutive characters into text spans based on spatial proximity
   * and font size. Spans represent logical "words" or "runs" of text.
   */
  extractSpans(textPagePtr: number): TextSpan[] {
    const boxes = this.extractCharBoxes(textPagePtr);
    if (boxes.length === 0) return [];

    const spans: TextSpan[] = [];
    let currentSpan: TextSpan | null = null;

    for (const box of boxes) {
      const isWhitespace = /\s/.test(box.char);

      if (!currentSpan || isWhitespace || !this._isContinuation(currentSpan, box)) {
        if (currentSpan && currentSpan.text.trim()) {
          spans.push(currentSpan);
        }

        if (isWhitespace) {
          currentSpan = null;
          continue;
        }

        currentSpan = {
          text: box.char,
          x: box.left,
          y: box.bottom,
          width: box.right - box.left,
          height: box.top - box.bottom,
          fontSize: box.fontSize,
          charIndex: box.index,
          charCount: 1,
        };
      } else {
        currentSpan.text += box.char;
        currentSpan.width = box.right - currentSpan.x;
        currentSpan.height = Math.max(currentSpan.height, box.top - box.bottom);
        currentSpan.charCount++;
      }
    }

    if (currentSpan && currentSpan.text.trim()) {
      spans.push(currentSpan);
    }

    return spans;
  }

  private _isContinuation(span: TextSpan, box: CharBox): boolean {
    const sameBaseline = Math.abs((span.y) - box.bottom) < span.fontSize * 0.5;
    const sameFontSize = Math.abs(span.fontSize - box.fontSize) < 0.5;
    const horizontalGap = box.left - (span.x + span.width);
    const maxGap = span.fontSize * 0.5;

    return sameBaseline && sameFontSize && horizontalGap < maxGap && horizontalGap > -span.fontSize * 0.3;
  }
}
