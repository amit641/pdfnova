import type { WasmModule, LinkInfo, TextRect } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Extracts web links and their bounding rectangles from a PDF page.
 * Uses FPDFLink_* APIs for link detection.
 */
export class LinkExtractor {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  extractLinks(textPagePtr: number, pageIndex: number): LinkInfo[] {
    const linkPageHandle = this.wasm._FPDFLink_LoadWebLinks(textPagePtr);
    if (linkPageHandle === 0) return [];

    const links: LinkInfo[] = [];

    try {
      const count = this.wasm._FPDFLink_CountWebLinks(linkPageHandle);

      for (let i = 0; i < count; i++) {
        const url = this.bridge.getLinkURL(linkPageHandle, i);
        if (!url) continue;

        const rects = this._getLinkRects(linkPageHandle, i);

        links.push({ url, rects, pageIndex });
      }
    } finally {
      this.wasm._FPDFLink_CloseWebLinks(linkPageHandle);
    }

    return links;
  }

  private _getLinkRects(linkPageHandle: number, linkIndex: number): TextRect[] {
    const rectCount = this.wasm._FPDFLink_CountRects(linkPageHandle, linkIndex);
    if (rectCount <= 0) return [];

    const rects: TextRect[] = [];
    const leftPtr = this.bridge.allocateF64();
    const topPtr = this.bridge.allocateF64();
    const rightPtr = this.bridge.allocateF64();
    const bottomPtr = this.bridge.allocateF64();

    try {
      for (let i = 0; i < rectCount; i++) {
        this.wasm._FPDFLink_GetRect(linkPageHandle, linkIndex, i, leftPtr, topPtr, rightPtr, bottomPtr);
        rects.push({
          left: this.bridge.readF64(leftPtr),
          top: this.bridge.readF64(topPtr),
          right: this.bridge.readF64(rightPtr),
          bottom: this.bridge.readF64(bottomPtr),
        });
      }
    } finally {
      this.bridge.freeAll(leftPtr, topPtr, rightPtr, bottomPtr);
    }

    return rects;
  }
}
