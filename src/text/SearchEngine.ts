import type { WasmModule, SearchResult, SearchOptions, TextRect } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Full-text search engine that uses PDFium's native FPDFText_Find* APIs
 * for accurate search with character-index-based results and highlight rects.
 */
export class SearchEngine {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  /**
   * Search across all pages of a document.
   */
  searchDocument(
    docPtr: number,
    pageCount: number,
    query: string,
    options?: SearchOptions,
  ): SearchResult[] {
    if (!query) return [];

    const allResults: SearchResult[] = [];
    let globalMatchIndex = 0;

    for (let i = 0; i < pageCount; i++) {
      const pagePtr = this.wasm._FPDF_LoadPage(docPtr, i);
      if (pagePtr === 0) continue;

      const textPagePtr = this.wasm._FPDFText_LoadPage(pagePtr);
      if (textPagePtr === 0) {
        this.wasm._FPDF_ClosePage(pagePtr);
        continue;
      }

      try {
        const pageResults = this.searchPage(textPagePtr, i, query, options);
        for (const result of pageResults) {
          result.matchIndex = globalMatchIndex++;
          allResults.push(result);
        }
      } finally {
        this.wasm._FPDFText_ClosePage(textPagePtr);
        this.wasm._FPDF_ClosePage(pagePtr);
      }
    }

    return allResults;
  }

  /**
   * Search within a single page's text content.
   */
  searchPage(
    textPagePtr: number,
    pageIndex: number,
    query: string,
    options?: SearchOptions,
  ): SearchResult[] {
    if (!query) return [];

    const results: SearchResult[] = [];
    let flags = 0;
    if (options?.caseSensitive) flags |= 0x01; // FPDF_MATCHCASE
    if (options?.wholeWord) flags |= 0x02;     // FPDF_MATCHWHOLEWORD

    const queryPtr = this.bridge.allocateUTF16String(query);

    try {
      const findHandle = this.wasm._FPDFText_FindStart(textPagePtr, queryPtr, flags, 0);
      if (findHandle === 0) return results;

      try {
        while (this.wasm._FPDFText_FindNext(findHandle)) {
          const charIndex = this.wasm._FPDFText_GetSchResultIndex(findHandle);
          const count = this.wasm._FPDFText_GetSchCount(findHandle);

          if (charIndex >= 0 && count > 0) {
            results.push({
              pageIndex,
              matchIndex: results.length,
              charIndex,
              charCount: count,
              rects: this._getMatchRects(textPagePtr, charIndex, count),
              text: this._getMatchText(textPagePtr, charIndex, count),
            });
          }
        }
      } finally {
        this.wasm._FPDFText_FindClose(findHandle);
      }
    } finally {
      this.bridge.free(queryPtr);
    }

    return results;
  }

  private _getMatchRects(textPagePtr: number, charIndex: number, charCount: number): TextRect[] {
    const numRects = this.wasm._FPDFText_CountRects(textPagePtr, charIndex, charCount);
    if (numRects <= 0) return [];

    const rects: TextRect[] = [];
    const leftPtr = this.bridge.allocateF64();
    const topPtr = this.bridge.allocateF64();
    const rightPtr = this.bridge.allocateF64();
    const bottomPtr = this.bridge.allocateF64();

    try {
      for (let i = 0; i < numRects; i++) {
        this.wasm._FPDFText_GetRect(textPagePtr, i, leftPtr, topPtr, rightPtr, bottomPtr);
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

  private _getMatchText(textPagePtr: number, charIndex: number, charCount: number): string {
    const bufSize = (charCount + 1) * 2;
    const buf = this.wasm._malloc(bufSize);
    this.wasm._FPDFText_GetText(textPagePtr, charIndex, charCount, buf);
    const text = this.bridge.readUTF16String(buf);
    this.wasm._free(buf);
    return text;
  }
}
