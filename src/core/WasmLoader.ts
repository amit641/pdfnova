import type { WasmModule, WasmTier } from '../types';

const PDFIUM_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@embedpdf/pdfium/dist/pdfium.wasm';

let wasmInstance: WasmModule | null = null;
let initPromise: Promise<WasmModule> | null = null;
let forceMock = false;

export class WasmLoader {
  static async load(options?: { wasmUrl?: string; tier?: WasmTier }): Promise<WasmModule> {
    if (wasmInstance) return wasmInstance;
    if (initPromise) return initPromise;

    initPromise = WasmLoader._doLoad(options);
    wasmInstance = await initPromise;
    return wasmInstance;
  }

  static isLoaded(): boolean {
    return wasmInstance !== null;
  }

  static getInstance(): WasmModule | null {
    return wasmInstance;
  }

  static reset(): void {
    if (wasmInstance) {
      try { wasmInstance._FPDF_DestroyLibrary(); } catch { /* already destroyed */ }
    }
    wasmInstance = null;
    initPromise = null;
  }

  /** Force mock mode (for unit tests in non-browser environments). */
  static enableMock(): void { forceMock = true; }
  static disableMock(): void { forceMock = false; }

  private static async _doLoad(options?: { wasmUrl?: string; tier?: WasmTier }): Promise<WasmModule> {
    if (forceMock || !WasmLoader._canLoadWasm()) {
      const { createMockModule } = await import('./WasmMock');
      return createMockModule();
    }

    return WasmLoader._loadRealPdfium(options);
  }

  private static _canLoadWasm(): boolean {
    return typeof globalThis.WebAssembly !== 'undefined' &&
           typeof globalThis.fetch === 'function' &&
           typeof globalThis.document !== 'undefined';
  }

  private static async _loadRealPdfium(options?: { wasmUrl?: string; tier?: WasmTier }): Promise<WasmModule> {
    const wasmUrl = options?.wasmUrl ?? PDFIUM_WASM_CDN;

    const { init } = await import('@embedpdf/pdfium');

    const response = await fetch(wasmUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDFium WASM: ${response.status}`);
    const wasmBinary = await response.arrayBuffer();

    const wrapped = await init({ wasmBinary } as any);
    wrapped.PDFiumExt_Init();

    return WasmLoader._adaptModule(wrapped);
  }

  /**
   * Adapts an @embedpdf/pdfium WrappedPdfiumModule to our WasmModule interface.
   * Uses cwrap with all-number signatures for raw C-level pointer-based access,
   * matching the interface that WasmBridge and all downstream code expects.
   */
  private static _adaptModule(wrapped: any): WasmModule {
    const raw = wrapped.pdfium;
    const cw = (name: string, ret: string | null, args: string[]) =>
      raw.cwrap(name, ret, args);

    const module: WasmModule = {
      HEAPU8: raw.HEAPU8,
      HEAPU32: raw.HEAPU32,
      HEAP32: raw.HEAP32,
      HEAPF32: raw.HEAPF32,
      HEAPF64: raw.HEAPF64,

      _malloc: raw.wasmExports.malloc,
      _free: raw.wasmExports.free,

      // PDFiumExt_Init already called — this is a no-op
      _FPDF_InitLibraryWithConfig: () => {},
      _FPDF_DestroyLibrary: cw('FPDF_DestroyLibrary', null, []),
      _FPDF_LoadMemDocument: cw('FPDF_LoadMemDocument', 'number', ['number', 'number', 'number']),
      _FPDF_CloseDocument: cw('FPDF_CloseDocument', null, ['number']),
      _FPDF_GetLastError: cw('FPDF_GetLastError', 'number', []),
      _FPDF_GetPageCount: cw('FPDF_GetPageCount', 'number', ['number']),

      _FPDF_LoadPage: cw('FPDF_LoadPage', 'number', ['number', 'number']),
      _FPDF_ClosePage: cw('FPDF_ClosePage', null, ['number']),
      _FPDF_GetPageWidthF: cw('FPDF_GetPageWidthF', 'number', ['number']),
      _FPDF_GetPageHeightF: cw('FPDF_GetPageHeightF', 'number', ['number']),

      _FPDFBitmap_Create: cw('FPDFBitmap_Create', 'number', ['number', 'number', 'number']),
      _FPDFBitmap_FillRect: cw('FPDFBitmap_FillRect', null, ['number', 'number', 'number', 'number', 'number', 'number']),
      _FPDFBitmap_GetBuffer: cw('FPDFBitmap_GetBuffer', 'number', ['number']),
      _FPDFBitmap_GetStride: cw('FPDFBitmap_GetStride', 'number', ['number']),
      _FPDFBitmap_Destroy: cw('FPDFBitmap_Destroy', null, ['number']),
      _FPDF_RenderPageBitmap: cw('FPDF_RenderPageBitmap', null, ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),

      _FPDFText_LoadPage: cw('FPDFText_LoadPage', 'number', ['number']),
      _FPDFText_ClosePage: cw('FPDFText_ClosePage', null, ['number']),
      _FPDFText_CountChars: cw('FPDFText_CountChars', 'number', ['number']),
      _FPDFText_GetUnicode: cw('FPDFText_GetUnicode', 'number', ['number', 'number']),
      _FPDFText_GetFontSize: cw('FPDFText_GetFontSize', 'number', ['number', 'number']),
      _FPDFText_GetCharBox: cw('FPDFText_GetCharBox', 'number', ['number', 'number', 'number', 'number', 'number', 'number']),
      _FPDFText_GetText: cw('FPDFText_GetText', 'number', ['number', 'number', 'number', 'number']),
      _FPDFText_FindStart: cw('FPDFText_FindStart', 'number', ['number', 'number', 'number', 'number']),
      _FPDFText_FindNext: cw('FPDFText_FindNext', 'number', ['number']),
      _FPDFText_FindClose: cw('FPDFText_FindClose', null, ['number']),
      _FPDFText_GetSchResultIndex: cw('FPDFText_GetSchResultIndex', 'number', ['number']),
      _FPDFText_GetSchCount: cw('FPDFText_GetSchCount', 'number', ['number']),
      _FPDFText_CountRects: cw('FPDFText_CountRects', 'number', ['number', 'number', 'number']),
      _FPDFText_GetRect: cw('FPDFText_GetRect', 'number', ['number', 'number', 'number', 'number', 'number', 'number']),

      _FPDF_GetMetaText: cw('FPDF_GetMetaText', 'number', ['number', 'number', 'number', 'number']),

      _FPDFBookmark_GetFirstChild: cw('FPDFBookmark_GetFirstChild', 'number', ['number', 'number']),
      _FPDFBookmark_GetNextSibling: cw('FPDFBookmark_GetNextSibling', 'number', ['number', 'number']),
      _FPDFBookmark_GetTitle: cw('FPDFBookmark_GetTitle', 'number', ['number', 'number', 'number']),
      _FPDFBookmark_GetAction: cw('FPDFBookmark_GetAction', 'number', ['number']),
      _FPDFBookmark_GetDest: cw('FPDFBookmark_GetDest', 'number', ['number', 'number']),
      _FPDFDest_GetDestPageIndex: cw('FPDFDest_GetDestPageIndex', 'number', ['number', 'number']),

      _FPDFLink_LoadWebLinks: cw('FPDFLink_LoadWebLinks', 'number', ['number']),
      _FPDFLink_CountWebLinks: cw('FPDFLink_CountWebLinks', 'number', ['number']),
      _FPDFLink_GetURL: cw('FPDFLink_GetURL', 'number', ['number', 'number', 'number', 'number']),
      _FPDFLink_CountRects: cw('FPDFLink_CountRects', 'number', ['number', 'number']),
      _FPDFLink_GetRect: cw('FPDFLink_GetRect', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number']),
      _FPDFLink_CloseWebLinks: cw('FPDFLink_CloseWebLinks', null, ['number']),

      // Full-tier: annotations
      _FPDFPage_GetAnnotCount: cw('FPDFPage_GetAnnotCount', 'number', ['number']),
      _FPDFPage_GetAnnot: cw('FPDFPage_GetAnnot', 'number', ['number', 'number']),
      _FPDFPage_CreateAnnot: cw('FPDFPage_CreateAnnot', 'number', ['number', 'number']),
      _FPDFPage_RemoveAnnot: cw('FPDFPage_RemoveAnnot', 'number', ['number', 'number']),
      _FPDFAnnot_GetSubtype: cw('FPDFAnnot_GetSubtype', 'number', ['number']),
      _FPDFAnnot_GetRect: cw('FPDFAnnot_GetRect', 'number', ['number', 'number']),
      _FPDFAnnot_SetRect: cw('FPDFAnnot_SetRect', 'number', ['number', 'number']),
      _FPDFAnnot_GetColor: cw('FPDFAnnot_GetColor', 'number', ['number', 'number', 'number', 'number', 'number', 'number']),
      _FPDFAnnot_SetColor: cw('FPDFAnnot_SetColor', 'number', ['number', 'number', 'number', 'number', 'number', 'number']),
      _FPDFAnnot_GetStringValue: cw('FPDFAnnot_GetStringValue', 'number', ['number', 'number', 'number', 'number']),
      _FPDFAnnot_SetStringValue: cw('FPDFAnnot_SetStringValue', 'number', ['number', 'number', 'number']),
      _FPDFAnnot_AppendAttachmentPoints: cw('FPDFAnnot_AppendAttachmentPoints', 'number', ['number', 'number']),
      _FPDFAnnot_CountAttachmentPoints: cw('FPDFAnnot_CountAttachmentPoints', 'number', ['number']),
      _FPDFAnnot_GetAttachmentPoints: cw('FPDFAnnot_GetAttachmentPoints', 'number', ['number', 'number', 'number']),
      _FPDFPage_CloseAnnot: cw('FPDFPage_CloseAnnot', null, ['number']),

      // Full-tier: forms
      _FPDFDOC_InitFormFillEnvironment: cw('FPDFDOC_InitFormFillEnvironment', 'number', ['number', 'number']),
      _FPDFDOC_ExitFormFillEnvironment: cw('FPDFDOC_ExitFormFillEnvironment', null, ['number']),
      _FPDF_GetFormType: cw('FPDF_GetFormType', 'number', ['number']),
      _FPDFPage_HasFormFieldAtPoint: cw('FPDFPage_HasFormFieldAtPoint', 'number', ['number', 'number', 'number', 'number']),
      _FORM_OnMouseMove: cw('FORM_OnMouseMove', 'number', ['number', 'number', 'number', 'number', 'number']),

      _FPDFAnnot_GetFormFieldType: cw('FPDFAnnot_GetFormFieldType', 'number', ['number', 'number']),
      _FPDFAnnot_GetFormFieldName: cw('FPDFAnnot_GetFormFieldName', 'number', ['number', 'number', 'number', 'number']),
      _FPDFAnnot_GetFormFieldValue: cw('FPDFAnnot_GetFormFieldValue', 'number', ['number', 'number', 'number', 'number']),
      _FPDFAnnot_SetFormFieldValue: cw('FPDFAnnot_SetFormFieldValue', null, ['number', 'number', 'number']),
      _FPDFAnnot_GetFormFieldFlags: cw('FPDFAnnot_GetFormFieldFlags', 'number', ['number', 'number']),
      _FPDFAnnot_IsChecked: cw('FPDFAnnot_IsChecked', 'number', ['number', 'number']),

      _FPDFPage_Flatten: cw('FPDFPage_Flatten', 'number', ['number', 'number']),

      _FPDF_SaveAsCopy: cw('FPDF_SaveAsCopy', 'number', ['number', 'number', 'number']),
      _FPDF_SaveWithVersion: cw('FPDF_SaveWithVersion', 'number', ['number', 'number', 'number', 'number']),

      // Full-tier: signatures (note: real PDFium uses FPDFSignatureObj, our interface uses FPDFSignObj)
      _FPDF_GetSignatureCount: cw('FPDF_GetSignatureCount', 'number', ['number']),
      _FPDF_GetSignatureObject: cw('FPDF_GetSignatureObject', 'number', ['number', 'number']),
      _FPDFSignObj_GetContents: cw('FPDFSignatureObj_GetContents', 'number', ['number', 'number', 'number']),
      _FPDFSignObj_GetByteRange: cw('FPDFSignatureObj_GetByteRange', 'number', ['number', 'number', 'number']),
      _FPDFSignObj_GetSubFilter: cw('FPDFSignatureObj_GetSubFilter', 'number', ['number', 'number', 'number']),
      _FPDFSignObj_GetReason: cw('FPDFSignatureObj_GetReason', 'number', ['number', 'number', 'number']),
      _FPDFSignObj_GetTime: cw('FPDFSignatureObj_GetTime', 'number', ['number', 'number', 'number']),
      _FPDFSignObj_GetDocMDPPermission: cw('FPDFSignatureObj_GetDocMDPPermission', 'number', ['number']),

      // Emscripten utilities
      UTF8ToString: raw.UTF8ToString.bind(raw),
      UTF16ToString: raw.UTF16ToString.bind(raw),
      stringToUTF8: raw.stringToUTF8.bind(raw),
      stringToUTF16: raw.stringToUTF16.bind(raw),
      lengthBytesUTF8: (str: string) => new TextEncoder().encode(str).length,
      lengthBytesUTF16: (str: string) => str.length * 2,
    };

    return module;
  }
}
