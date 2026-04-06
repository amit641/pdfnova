import type { WasmModule, CreateAnnotationOptions, AnnotationColor, AnnotationRect } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Creates and modifies annotations on PDF pages using PDFium's FPDFAnnot_* APIs.
 */
export class AnnotationWriter {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  addAnnotation(pagePtr: number, options: CreateAnnotationOptions): void {
    if (!this.wasm._FPDFPage_CreateAnnot) {
      throw new Error('Annotation creation requires the full pdfnova build');
    }

    const annotPtr = this.wasm._FPDFPage_CreateAnnot(pagePtr, options.type);
    if (annotPtr === 0) throw new Error('Failed to create annotation');

    try {
      this._setRect(annotPtr, options.rect);

      if (options.color) {
        this._setColor(annotPtr, options.color);
      }

      if (options.contents) {
        const valuePtr = this.bridge.allocateUTF16String(options.contents);
        const keyPtr = this.bridge.allocateString('Contents');
        this.wasm._FPDFAnnot_SetStringValue!(annotPtr, keyPtr, valuePtr);
        this.bridge.freeAll(keyPtr, valuePtr);
      }

      if (options.attachmentPoints) {
        for (const point of options.attachmentPoints) {
          const buf = this.wasm._malloc(64);
          this.wasm.HEAPF64[buf >> 3] = point.x1;
          this.wasm.HEAPF64[(buf + 8) >> 3] = point.y1;
          this.wasm.HEAPF64[(buf + 16) >> 3] = point.x2;
          this.wasm.HEAPF64[(buf + 24) >> 3] = point.y2;
          this.wasm.HEAPF64[(buf + 32) >> 3] = point.x3;
          this.wasm.HEAPF64[(buf + 40) >> 3] = point.y3;
          this.wasm.HEAPF64[(buf + 48) >> 3] = point.x4;
          this.wasm.HEAPF64[(buf + 56) >> 3] = point.y4;
          this.wasm._FPDFAnnot_AppendAttachmentPoints!(annotPtr, buf);
          this.wasm._free(buf);
        }
      }
    } finally {
      this.wasm._FPDFPage_CloseAnnot!(annotPtr);
    }
  }

  removeAnnotation(pagePtr: number, index: number): void {
    if (!this.wasm._FPDFPage_RemoveAnnot) {
      throw new Error('Annotation removal requires the full pdfnova build');
    }

    const result = this.wasm._FPDFPage_RemoveAnnot(pagePtr, index);
    if (result === 0) throw new Error(`Failed to remove annotation at index ${index}`);
  }

  private _setRect(annotPtr: number, rect: AnnotationRect): void {
    const buf = this.wasm._malloc(32);
    this.wasm.HEAPF64[buf >> 3] = rect.left;
    this.wasm.HEAPF64[(buf + 8) >> 3] = rect.bottom;
    this.wasm.HEAPF64[(buf + 16) >> 3] = rect.right;
    this.wasm.HEAPF64[(buf + 24) >> 3] = rect.top;
    this.wasm._FPDFAnnot_SetRect!(annotPtr, buf);
    this.wasm._free(buf);
  }

  private _setColor(annotPtr: number, color: AnnotationColor): void {
    this.wasm._FPDFAnnot_SetColor!(
      annotPtr, 0,
      color.r, color.g, color.b, color.a,
    );
  }
}
