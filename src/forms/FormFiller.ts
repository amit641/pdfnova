import type { WasmModule } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Fills form field values programmatically.
 * Finds the matching field by name across all pages and sets its value.
 */
export class FormFiller {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  setFieldValue(
    docPtr: number,
    formHandle: number,
    pageCount: number,
    fieldName: string,
    value: string,
  ): boolean {
    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      const pagePtr = this.wasm._FPDF_LoadPage(docPtr, pageIdx);
      if (pagePtr === 0) continue;

      try {
        const found = this._setFieldOnPage(pagePtr, formHandle, fieldName, value);
        if (found) return true;
      } finally {
        this.wasm._FPDF_ClosePage(pagePtr);
      }
    }

    throw new Error(`Form field "${fieldName}" not found`);
  }

  private _setFieldOnPage(
    pagePtr: number,
    formHandle: number,
    fieldName: string,
    value: string,
  ): boolean {
    if (!this.wasm._FPDFPage_GetAnnotCount) return false;

    const count = this.wasm._FPDFPage_GetAnnotCount(pagePtr);

    for (let i = 0; i < count; i++) {
      const annotPtr = this.wasm._FPDFPage_GetAnnot!(pagePtr, i);
      if (annotPtr === 0) continue;

      try {
        const subtype = this.wasm._FPDFAnnot_GetSubtype!(annotPtr);
        if (subtype !== 20) continue; // Not a widget

        const name = this.bridge.getFormFieldName(formHandle, annotPtr);
        if (name !== fieldName) continue;

        if (this.wasm._FPDFAnnot_SetFormFieldValue) {
          const valuePtr = this.bridge.allocateUTF16String(value);
          this.wasm._FPDFAnnot_SetFormFieldValue(formHandle, annotPtr, valuePtr);
          this.bridge.free(valuePtr);
        }

        return true;
      } finally {
        this.wasm._FPDFPage_CloseAnnot!(annotPtr);
      }
    }

    return false;
  }
}
