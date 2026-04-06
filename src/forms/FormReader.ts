import type { WasmModule, FormFieldData } from '../types';
import { FormFieldType } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Reads form fields from all pages of a PDF document.
 * Iterates through annotations of type Widget to find form fields.
 */
export class FormReader {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  readAllFields(docPtr: number, formHandle: number, pageCount: number): FormFieldData[] {
    const fields: FormFieldData[] = [];

    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      const pagePtr = this.wasm._FPDF_LoadPage(docPtr, pageIdx);
      if (pagePtr === 0) continue;

      try {
        const pageFields = this._readPageFields(pagePtr, formHandle, pageIdx);
        fields.push(...pageFields);
      } finally {
        this.wasm._FPDF_ClosePage(pagePtr);
      }
    }

    return fields;
  }

  private _readPageFields(pagePtr: number, formHandle: number, pageIndex: number): FormFieldData[] {
    if (!this.wasm._FPDFPage_GetAnnotCount) return [];

    const annotCount = this.wasm._FPDFPage_GetAnnotCount(pagePtr);
    const fields: FormFieldData[] = [];

    for (let i = 0; i < annotCount; i++) {
      const annotPtr = this.wasm._FPDFPage_GetAnnot!(pagePtr, i);
      if (annotPtr === 0) continue;

      try {
        const subtype = this.wasm._FPDFAnnot_GetSubtype!(annotPtr);
        // Widget annotation (subtype 20) = form field
        if (subtype !== 20) continue;

        const fieldType = this.wasm._FPDFAnnot_GetFormFieldType
          ? this.wasm._FPDFAnnot_GetFormFieldType(formHandle, annotPtr) as FormFieldType
          : FormFieldType.Unknown;

        const name = this.bridge.getFormFieldName(formHandle, annotPtr);
        const value = this.bridge.getFormFieldValue(formHandle, annotPtr);
        const flags = this.wasm._FPDFAnnot_GetFormFieldFlags
          ? this.wasm._FPDFAnnot_GetFormFieldFlags(formHandle, annotPtr)
          : 0;

        let isChecked: boolean | undefined;
        if (fieldType === FormFieldType.CheckBox || fieldType === FormFieldType.RadioButton) {
          isChecked = this.wasm._FPDFAnnot_IsChecked
            ? this.wasm._FPDFAnnot_IsChecked(formHandle, annotPtr) !== 0
            : undefined;
        }

        fields.push({
          name,
          type: fieldType,
          value,
          flags,
          isChecked,
          pageIndex,
          annotIndex: i,
        });
      } finally {
        this.wasm._FPDFPage_CloseAnnot!(annotPtr);
      }
    }

    return fields;
  }
}
