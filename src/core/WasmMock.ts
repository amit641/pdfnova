import type { WasmModule } from '../types';

/**
 * Creates a mock PDFium module for development/testing environments
 * where the real WASM binary cannot be loaded (Node.js, jsdom, etc.).
 *
 * The mock exercises the full API surface with basic PDF structure
 * parsing, but does NOT perform real rendering or text extraction.
 */
export function createMockModule(): WasmModule {
  const heap = new ArrayBuffer(256 * 1024 * 1024);
  const HEAPU8 = new Uint8Array(heap);
  const HEAPU32 = new Uint32Array(heap);
  const HEAP32 = new Int32Array(heap);
  const HEAPF32 = new Float32Array(heap);
  const HEAPF64 = new Float64Array(heap);

  let nextPtr = 1024;

  function malloc(size: number): number {
    const aligned = (size + 7) & ~7;
    const ptr = nextPtr;
    nextPtr += aligned;
    return ptr;
  }

  function free(_ptr: number): void {}

  const documents = new Map<number, { data: Uint8Array; pageCount: number; password: string | null }>();
  let nextDocHandle = 100;
  let lastError = 0;

  const pages = new Map<number, { docHandle: number; pageIndex: number; width: number; height: number }>();
  let nextPageHandle = 1000;

  const textPages = new Map<number, { pageHandle: number; text: string }>();
  let nextTextPageHandle = 5000;

  const bitmaps = new Map<number, { width: number; height: number; buffer: number; stride: number }>();
  let nextBitmapHandle = 10000;

  interface SearchState { tpHandle: number; needle: string; caseSensitive: boolean; pos: number; matchIdx: number; matchLen: number; }
  const searches = new Map<number, SearchState>();
  let nextSearchHandle = 20000;

  const module: WasmModule = {
    HEAPU8, HEAPU32, HEAP32, HEAPF32, HEAPF64,
    _malloc: malloc,
    _free: free,

    _FPDF_InitLibraryWithConfig(_configPtr: number) {},
    _FPDF_DestroyLibrary() { documents.clear(); pages.clear(); textPages.clear(); bitmaps.clear(); },

    _FPDF_LoadMemDocument(buf: number, size: number, password: number): number {
      const data = HEAPU8.slice(buf, buf + size);
      const header = String.fromCharCode(...data.slice(0, 5));
      if (header !== '%PDF-') { lastError = 1; return 0; }
      const handle = nextDocHandle++;
      const pw = password ? module.UTF8ToString(password) : null;
      const content = new TextDecoder().decode(data);
      const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
      const pageCount = pageMatches ? pageMatches.length : 1;
      documents.set(handle, { data, pageCount, password: pw });
      lastError = 0;
      return handle;
    },

    _FPDF_CloseDocument(doc: number) { documents.delete(doc); },
    _FPDF_GetLastError() { return lastError; },
    _FPDF_GetPageCount(doc: number) { return documents.get(doc)?.pageCount ?? 0; },

    _FPDF_LoadPage(doc: number, pageIndex: number): number {
      const d = documents.get(doc);
      if (!d || pageIndex < 0 || pageIndex >= d.pageCount) return 0;
      const handle = nextPageHandle++;
      pages.set(handle, { docHandle: doc, pageIndex, width: 612, height: 792 });
      return handle;
    },
    _FPDF_ClosePage(page: number) { pages.delete(page); },
    _FPDF_GetPageWidthF(page: number) { return pages.get(page)?.width ?? 0; },
    _FPDF_GetPageHeightF(page: number) { return pages.get(page)?.height ?? 0; },

    _FPDFBitmap_Create(width: number, height: number, _alpha: number): number {
      const stride = width * 4;
      const bufSize = stride * height;
      const buffer = malloc(bufSize);
      HEAPU8.fill(255, buffer, buffer + bufSize);
      const handle = nextBitmapHandle++;
      bitmaps.set(handle, { width, height, buffer, stride });
      return handle;
    },
    _FPDFBitmap_FillRect(bitmap: number, left: number, top: number, width: number, height: number, color: number) {
      const bmp = bitmaps.get(bitmap);
      if (!bmp) return;
      const r = (color >> 24) & 0xff, g = (color >> 16) & 0xff, b = (color >> 8) & 0xff, a = color & 0xff;
      for (let y = top; y < top + height && y < bmp.height; y++) {
        for (let x = left; x < left + width && x < bmp.width; x++) {
          const offset = bmp.buffer + y * bmp.stride + x * 4;
          HEAPU8[offset] = b; HEAPU8[offset + 1] = g; HEAPU8[offset + 2] = r; HEAPU8[offset + 3] = a;
        }
      }
    },
    _FPDFBitmap_GetBuffer(bitmap: number) { return bitmaps.get(bitmap)?.buffer ?? 0; },
    _FPDFBitmap_GetStride(bitmap: number) { return bitmaps.get(bitmap)?.stride ?? 0; },
    _FPDFBitmap_Destroy(bitmap: number) { bitmaps.delete(bitmap); },

    _FPDF_RenderPageBitmap() {},

    _FPDFText_LoadPage(page: number): number {
      if (!pages.has(page)) return 0;
      const handle = nextTextPageHandle++;
      textPages.set(handle, { pageHandle: page, text: 'Sample PDF text content for page.' });
      return handle;
    },
    _FPDFText_ClosePage(textPage: number) { textPages.delete(textPage); },
    _FPDFText_CountChars(textPage: number) { return textPages.get(textPage)?.text.length ?? 0; },
    _FPDFText_GetUnicode(textPage: number, index: number) {
      const tp = textPages.get(textPage);
      return tp ? tp.text.charCodeAt(index) : 0;
    },
    _FPDFText_GetFontSize(textPage: number, _index: number) { return textPages.has(textPage) ? 12.0 : 0; },
    _FPDFText_GetCharBox(textPage: number, index: number, leftPtr: number, rightPtr: number, bottomPtr: number, topPtr: number): number {
      if (!textPages.has(textPage)) return 0;
      const charWidth = 7.2;
      const x = (index % 80) * charWidth;
      const y = 792 - Math.floor(index / 80) * 14;
      HEAPF64[leftPtr >> 3] = x;
      HEAPF64[rightPtr >> 3] = x + charWidth;
      HEAPF64[bottomPtr >> 3] = y - 12;
      HEAPF64[topPtr >> 3] = y;
      return 1;
    },
    _FPDFText_GetText(textPage: number, startIndex: number, count: number, buf: number): number {
      const tp = textPages.get(textPage);
      if (!tp) return 0;
      const sub = tp.text.slice(startIndex, startIndex + count);
      module.stringToUTF16(sub, buf, (count + 1) * 2);
      return sub.length;
    },
    _FPDFText_FindStart(textPage: number, findWhat: number, flags: number, startIndex: number): number {
      const tp = textPages.get(textPage);
      if (!tp) return 0;
      const query = module.UTF16ToString(findWhat);
      const caseSensitive = (flags & 0x01) !== 0;
      const handle = nextSearchHandle++;
      searches.set(handle, { tpHandle: textPage, needle: query, caseSensitive, pos: startIndex, matchIdx: -1, matchLen: query.length });
      return handle;
    },
    _FPDFText_FindNext(findHandle: number): number {
      const state = searches.get(findHandle);
      if (!state) return 0;
      const tp = textPages.get(state.tpHandle);
      if (!tp) return 0;
      const text = state.caseSensitive ? tp.text : tp.text.toLowerCase();
      const needle = state.caseSensitive ? state.needle : state.needle.toLowerCase();
      const idx = text.indexOf(needle, state.pos);
      if (idx < 0) { state.matchIdx = -1; return 0; }
      state.matchIdx = idx;
      state.pos = idx + 1;
      return 1;
    },
    _FPDFText_FindClose(findHandle: number) { searches.delete(findHandle); },
    _FPDFText_GetSchResultIndex(findHandle: number): number { return searches.get(findHandle)?.matchIdx ?? -1; },
    _FPDFText_GetSchCount(findHandle: number): number { return searches.get(findHandle)?.matchLen ?? 0; },
    _FPDFText_CountRects(textPage: number, _startIndex: number, _count: number): number { return textPages.has(textPage) ? 1 : 0; },
    _FPDFText_GetRect(textPage: number, _rectIndex: number, leftPtr: number, topPtr: number, rightPtr: number, bottomPtr: number): number {
      if (!textPages.has(textPage)) return 0;
      HEAPF64[leftPtr >> 3] = 72; HEAPF64[topPtr >> 3] = 720;
      HEAPF64[rightPtr >> 3] = 540; HEAPF64[bottomPtr >> 3] = 708;
      return 1;
    },

    _FPDF_GetMetaText(doc: number, tag: number, buf: number, bufLen: number): number {
      if (!documents.has(doc)) return 0;
      const tagStr = module.UTF8ToString(tag);
      const meta: Record<string, string> = {
        Title: 'Untitled', Author: '', Subject: '', Keywords: '',
        Creator: 'pdfnova', Producer: 'pdfnova', CreationDate: '', ModDate: '',
      };
      const value = meta[tagStr] ?? '';
      if (bufLen === 0) return (value.length + 1) * 2;
      module.stringToUTF16(value, buf, bufLen);
      return (value.length + 1) * 2;
    },

    _FPDFBookmark_GetFirstChild(_doc: number, _bookmark: number) { return 0; },
    _FPDFBookmark_GetNextSibling(_doc: number, _bookmark: number) { return 0; },
    _FPDFBookmark_GetTitle(_bookmark: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFBookmark_GetAction(_bookmark: number) { return 0; },
    _FPDFBookmark_GetDest(_doc: number, _bookmark: number) { return 0; },
    _FPDFDest_GetDestPageIndex(_doc: number, _dest: number) { return 0; },

    _FPDFLink_LoadWebLinks(_textPage: number) { return 0; },
    _FPDFLink_CountWebLinks(_linkPage: number) { return 0; },
    _FPDFLink_GetURL(_linkPage: number, _linkIndex: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFLink_CountRects(_linkPage: number, _linkIndex: number) { return 0; },
    _FPDFLink_GetRect() {},
    _FPDFLink_CloseWebLinks(_linkPage: number) {},

    _FPDFPage_GetAnnotCount(page: number) { return pages.has(page) ? 0 : 0; },
    _FPDFPage_GetAnnot(_page: number, _index: number) { return 0; },
    _FPDFPage_CreateAnnot(_page: number, _subtype: number) { return malloc(8); },
    _FPDFPage_RemoveAnnot(_page: number, _index: number) { return 1; },
    _FPDFAnnot_GetSubtype(_annot: number) { return 0; },
    _FPDFAnnot_GetRect(_annot: number, _rect: number) { return 1; },
    _FPDFAnnot_SetRect(_annot: number, _rect: number) { return 1; },
    _FPDFAnnot_GetColor(_annot: number, _type: number, _r: number, _g: number, _b: number, _a: number) { return 1; },
    _FPDFAnnot_SetColor(_annot: number, _type: number, _r: number, _g: number, _b: number, _a: number) { return 1; },
    _FPDFAnnot_GetStringValue(_annot: number, _key: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFAnnot_SetStringValue(_annot: number, _key: number, _value: number) { return 1; },
    _FPDFAnnot_AppendAttachmentPoints(_annot: number, _points: number) { return 1; },
    _FPDFAnnot_CountAttachmentPoints(_annot: number) { return 0; },
    _FPDFAnnot_GetAttachmentPoints(_annot: number, _index: number, _points: number) { return 1; },
    _FPDFPage_CloseAnnot(_annot: number) {},

    _FPDFDOC_InitFormFillEnvironment(_doc: number, _formInfo: number) { return malloc(8); },
    _FPDFDOC_ExitFormFillEnvironment(_formHandle: number) {},
    _FPDF_GetFormType(_doc: number) { return 0; },
    _FPDFPage_HasFormFieldAtPoint(_formHandle: number, _page: number, _x: number, _y: number) { return -1; },
    _FORM_OnMouseMove(_formHandle: number, _page: number, _modifier: number, _x: number, _y: number) {},

    _FPDFAnnot_GetFormFieldType(_formHandle: number, _annot: number) { return -1; },
    _FPDFAnnot_GetFormFieldName(_formHandle: number, _annot: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFAnnot_GetFormFieldValue(_formHandle: number, _annot: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFAnnot_SetFormFieldValue(_formHandle: number, _annot: number, _value: number) {},
    _FPDFAnnot_GetFormFieldFlags(_formHandle: number, _annot: number) { return 0; },
    _FPDFAnnot_IsChecked(_formHandle: number, _annot: number) { return 0; },

    _FPDFPage_Flatten(_page: number, _usage: number) { return 1; },

    _FPDF_SaveAsCopy(_doc: number, _writer: number, _flags: number) { return 1; },
    _FPDF_SaveWithVersion(_doc: number, _writer: number, _flags: number, _version: number) { return 1; },

    _FPDF_GetSignatureCount(_doc: number) { return 0; },
    _FPDF_GetSignatureObject(_doc: number, _index: number) { return 0; },
    _FPDFSignObj_GetContents(_sig: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFSignObj_GetByteRange(_sig: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFSignObj_GetSubFilter(_sig: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFSignObj_GetReason(_sig: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFSignObj_GetTime(_sig: number, _buf: number, _bufLen: number) { return 0; },
    _FPDFSignObj_GetDocMDPPermission(_sig: number) { return 0; },

    UTF8ToString(ptr: number): string {
      let end = ptr;
      while (HEAPU8[end] !== 0) end++;
      return new TextDecoder().decode(HEAPU8.slice(ptr, end));
    },
    UTF16ToString(ptr: number): string {
      const u16 = new Uint16Array(heap, ptr);
      let str = '';
      for (let i = 0; u16[i] !== 0; i++) str += String.fromCharCode(u16[i]);
      return str;
    },
    stringToUTF8(str: string, outPtr: number, maxBytes: number) {
      const encoded = new TextEncoder().encode(str);
      const len = Math.min(encoded.length, maxBytes - 1);
      HEAPU8.set(encoded.subarray(0, len), outPtr);
      HEAPU8[outPtr + len] = 0;
    },
    stringToUTF16(str: string, outPtr: number, maxBytes: number) {
      const u16 = new Uint16Array(heap, outPtr, maxBytes >> 1);
      for (let i = 0; i < str.length && i < (maxBytes >> 1) - 1; i++) {
        u16[i] = str.charCodeAt(i);
      }
      if (str.length < (maxBytes >> 1)) u16[str.length] = 0;
    },
    lengthBytesUTF8(str: string): number {
      return new TextEncoder().encode(str).length;
    },
    lengthBytesUTF16(str: string): number {
      return str.length * 2;
    },
  };

  return module;
}
