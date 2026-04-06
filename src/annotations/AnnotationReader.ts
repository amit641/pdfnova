import type { WasmModule, AnnotationData, AnnotationColor, AnnotationRect, AttachmentPoint } from '../types';
import { AnnotationType } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Reads annotations from a PDF page using PDFium's FPDFAnnot_* APIs.
 */
export class AnnotationReader {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  readAnnotations(pagePtr: number): AnnotationData[] {
    if (!this.wasm._FPDFPage_GetAnnotCount) return [];

    const count = this.wasm._FPDFPage_GetAnnotCount(pagePtr);
    const annotations: AnnotationData[] = [];

    for (let i = 0; i < count; i++) {
      const annotPtr = this.wasm._FPDFPage_GetAnnot!(pagePtr, i);
      if (annotPtr === 0) continue;

      try {
        const data = this._readAnnotation(annotPtr, i);
        if (data) annotations.push(data);
      } finally {
        this.wasm._FPDFPage_CloseAnnot!(annotPtr);
      }
    }

    return annotations;
  }

  private _readAnnotation(annotPtr: number, index: number): AnnotationData | null {
    const subtype = this.wasm._FPDFAnnot_GetSubtype!(annotPtr);
    const type = subtype as AnnotationType;

    const rect = this._getRect(annotPtr);
    if (!rect) return null;

    const color = this._getColor(annotPtr);
    const contents = this.bridge.getAnnotStringValue(annotPtr, 'Contents');
    const author = this.bridge.getAnnotStringValue(annotPtr, 'T');
    const modDate = this.bridge.getAnnotStringValue(annotPtr, 'M');

    const attachmentPoints = this._getAttachmentPoints(annotPtr);

    return {
      index,
      type,
      rect,
      color: color ?? undefined,
      contents: contents || undefined,
      author: author || undefined,
      modificationDate: modDate || undefined,
      attachmentPoints: attachmentPoints.length > 0 ? attachmentPoints : undefined,
    };
  }

  private _getRect(annotPtr: number): AnnotationRect | null {
    const rectBuf = this.wasm._malloc(32); // 4 doubles
    const ok = this.wasm._FPDFAnnot_GetRect!(annotPtr, rectBuf);
    if (!ok) {
      this.wasm._free(rectBuf);
      return null;
    }

    const rect: AnnotationRect = {
      left: this.wasm.HEAPF64[rectBuf >> 3],
      bottom: this.wasm.HEAPF64[(rectBuf + 8) >> 3],
      right: this.wasm.HEAPF64[(rectBuf + 16) >> 3],
      top: this.wasm.HEAPF64[(rectBuf + 24) >> 3],
    };

    this.wasm._free(rectBuf);
    return rect;
  }

  private _getColor(annotPtr: number): AnnotationColor | null {
    const rPtr = this.wasm._malloc(4);
    const gPtr = this.wasm._malloc(4);
    const bPtr = this.wasm._malloc(4);
    const aPtr = this.wasm._malloc(4);

    // type 0 = color, 1 = interior color
    const ok = this.wasm._FPDFAnnot_GetColor!(annotPtr, 0, rPtr, gPtr, bPtr, aPtr);

    if (!ok) {
      this.bridge.freeAll(rPtr, gPtr, bPtr, aPtr);
      return null;
    }

    const color: AnnotationColor = {
      r: this.wasm.HEAPU32[rPtr >> 2],
      g: this.wasm.HEAPU32[gPtr >> 2],
      b: this.wasm.HEAPU32[bPtr >> 2],
      a: this.wasm.HEAPU32[aPtr >> 2],
    };

    this.bridge.freeAll(rPtr, gPtr, bPtr, aPtr);
    return color;
  }

  private _getAttachmentPoints(annotPtr: number): AttachmentPoint[] {
    if (!this.wasm._FPDFAnnot_CountAttachmentPoints) return [];

    const count = this.wasm._FPDFAnnot_CountAttachmentPoints(annotPtr);
    if (count <= 0) return [];

    const points: AttachmentPoint[] = [];
    const buf = this.wasm._malloc(64); // 8 doubles (4 quadrilateral points x 2 coords)

    for (let i = 0; i < count; i++) {
      this.wasm._FPDFAnnot_GetAttachmentPoints!(annotPtr, i, buf);
      points.push({
        x1: this.wasm.HEAPF64[buf >> 3],
        y1: this.wasm.HEAPF64[(buf + 8) >> 3],
        x2: this.wasm.HEAPF64[(buf + 16) >> 3],
        y2: this.wasm.HEAPF64[(buf + 24) >> 3],
        x3: this.wasm.HEAPF64[(buf + 32) >> 3],
        y3: this.wasm.HEAPF64[(buf + 40) >> 3],
        x4: this.wasm.HEAPF64[(buf + 48) >> 3],
        y4: this.wasm.HEAPF64[(buf + 56) >> 3],
      });
    }

    this.wasm._free(buf);
    return points;
  }
}
