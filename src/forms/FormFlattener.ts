import type { WasmModule } from '../types';

/**
 * Flattens form fields into static page content.
 * After flattening, form fields become non-interactive rendered graphics.
 */
export class FormFlattener {
  private wasm: WasmModule;

  constructor(wasm: WasmModule) {
    this.wasm = wasm;
  }

  /**
   * Flatten all form fields across all pages.
   * @param usage - 0 for normal display, 1 for print appearance
   * @returns Number of pages successfully flattened
   */
  flattenAll(docPtr: number, pageCount: number, usage: number = 0): number {
    if (!this.wasm._FPDFPage_Flatten) {
      throw new Error('Form flattening requires the full pdfnova build');
    }

    let flattenedCount = 0;

    for (let i = 0; i < pageCount; i++) {
      const pagePtr = this.wasm._FPDF_LoadPage(docPtr, i);
      if (pagePtr === 0) continue;

      try {
        const result = this.wasm._FPDFPage_Flatten(pagePtr, usage);
        // 0 = cannot flatten (no forms), 1 = success, 2 = nothing to flatten
        if (result === 1) flattenedCount++;
      } finally {
        this.wasm._FPDF_ClosePage(pagePtr);
      }
    }

    return flattenedCount;
  }

  /**
   * Flatten form fields on a single page.
   */
  flattenPage(pagePtr: number, usage: number = 0): boolean {
    if (!this.wasm._FPDFPage_Flatten) {
      throw new Error('Form flattening requires the full pdfnova build');
    }
    return this.wasm._FPDFPage_Flatten(pagePtr, usage) === 1;
  }
}
