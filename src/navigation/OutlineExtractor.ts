import type { WasmModule, OutlineItem } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Extracts the document outline (bookmarks/TOC) from a PDF.
 * Recursively walks the bookmark tree using PDFium's FPDFBookmark_* APIs.
 */
export class OutlineExtractor {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  extract(docPtr: number): OutlineItem[] {
    return this._walkBookmarks(docPtr, 0);
  }

  private _walkBookmarks(docPtr: number, parentBookmark: number): OutlineItem[] {
    const items: OutlineItem[] = [];

    let bookmark = this.wasm._FPDFBookmark_GetFirstChild(docPtr, parentBookmark);
    while (bookmark !== 0) {
      const title = this.bridge.getBookmarkTitle(bookmark);
      let pageIndex = -1;

      const dest = this.wasm._FPDFBookmark_GetDest(docPtr, bookmark);
      if (dest !== 0) {
        pageIndex = this.wasm._FPDFDest_GetDestPageIndex(docPtr, dest);
      } else {
        const action = this.wasm._FPDFBookmark_GetAction(bookmark);
        if (action !== 0) {
          // Action-based bookmark — could resolve destination further
          // but for now we leave pageIndex as -1
        }
      }

      const children = this._walkBookmarks(docPtr, bookmark);

      items.push({ title, pageIndex, children });

      bookmark = this.wasm._FPDFBookmark_GetNextSibling(docPtr, bookmark);
    }

    return items;
  }
}
