// ─── WASM / Core ────────────────────────────────────────────────

export type WasmTier = 'lite' | 'full';

export interface WasmModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  HEAP32: Int32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;

  _malloc(size: number): number;
  _free(ptr: number): void;

  // Document lifecycle
  _FPDF_InitLibraryWithConfig(configPtr: number): void;
  _FPDF_DestroyLibrary(): void;
  _FPDF_LoadMemDocument(buf: number, size: number, password: number): number;
  _FPDF_CloseDocument(doc: number): void;
  _FPDF_GetLastError(): number;
  _FPDF_GetPageCount(doc: number): number;

  // Page lifecycle
  _FPDF_LoadPage(doc: number, pageIndex: number): number;
  _FPDF_ClosePage(page: number): void;
  _FPDF_GetPageWidthF(page: number): number;
  _FPDF_GetPageHeightF(page: number): number;

  // Rendering
  _FPDFBitmap_Create(width: number, height: number, alpha: number): number;
  _FPDFBitmap_FillRect(bitmap: number, left: number, top: number, width: number, height: number, color: number): void;
  _FPDFBitmap_GetBuffer(bitmap: number): number;
  _FPDFBitmap_GetStride(bitmap: number): number;
  _FPDFBitmap_Destroy(bitmap: number): void;
  _FPDF_RenderPageBitmap(bitmap: number, page: number, startX: number, startY: number, sizeX: number, sizeY: number, rotate: number, flags: number): void;

  // Text
  _FPDFText_LoadPage(page: number): number;
  _FPDFText_ClosePage(textPage: number): void;
  _FPDFText_CountChars(textPage: number): number;
  _FPDFText_GetUnicode(textPage: number, index: number): number;
  _FPDFText_GetFontSize(textPage: number, index: number): number;
  _FPDFText_GetCharBox(textPage: number, index: number, left: number, right: number, bottom: number, top: number): number;
  _FPDFText_GetText(textPage: number, startIndex: number, count: number, buf: number): number;
  _FPDFText_FindStart(textPage: number, findWhat: number, flags: number, startIndex: number): number;
  _FPDFText_FindNext(findHandle: number): number;
  _FPDFText_FindClose(findHandle: number): void;
  _FPDFText_GetSchResultIndex(findHandle: number): number;
  _FPDFText_GetSchCount(findHandle: number): number;
  _FPDFText_CountRects(textPage: number, startIndex: number, count: number): number;
  _FPDFText_GetRect(textPage: number, rectIndex: number, left: number, top: number, right: number, bottom: number): number;

  // Metadata
  _FPDF_GetMetaText(doc: number, tag: number, buf: number, bufLen: number): number;

  // Bookmarks
  _FPDFBookmark_GetFirstChild(doc: number, bookmark: number): number;
  _FPDFBookmark_GetNextSibling(doc: number, bookmark: number): number;
  _FPDFBookmark_GetTitle(bookmark: number, buf: number, bufLen: number): number;
  _FPDFBookmark_GetAction(bookmark: number): number;
  _FPDFBookmark_GetDest(doc: number, bookmark: number): number;
  _FPDFDest_GetDestPageIndex(doc: number, dest: number): number;

  // Links
  _FPDFLink_LoadWebLinks(textPage: number): number;
  _FPDFLink_CountWebLinks(linkPage: number): number;
  _FPDFLink_GetURL(linkPage: number, linkIndex: number, buf: number, bufLen: number): number;
  _FPDFLink_CountRects(linkPage: number, linkIndex: number): number;
  _FPDFLink_GetRect(linkPage: number, linkIndex: number, rectIndex: number, left: number, top: number, right: number, bottom: number): void;
  _FPDFLink_CloseWebLinks(linkPage: number): void;

  // ─── Full-tier only ───────────────────────────────────────────

  // Annotations
  _FPDFPage_GetAnnotCount?(page: number): number;
  _FPDFPage_GetAnnot?(page: number, index: number): number;
  _FPDFPage_CreateAnnot?(page: number, subtype: number): number;
  _FPDFPage_RemoveAnnot?(page: number, index: number): number;
  _FPDFAnnot_GetSubtype?(annot: number): number;
  _FPDFAnnot_GetRect?(annot: number, rect: number): number;
  _FPDFAnnot_SetRect?(annot: number, rect: number): number;
  _FPDFAnnot_GetColor?(annot: number, type: number, r: number, g: number, b: number, a: number): number;
  _FPDFAnnot_SetColor?(annot: number, type: number, r: number, g: number, b: number, a: number): number;
  _FPDFAnnot_GetStringValue?(annot: number, key: number, buf: number, bufLen: number): number;
  _FPDFAnnot_SetStringValue?(annot: number, key: number, value: number): number;
  _FPDFAnnot_AppendAttachmentPoints?(annot: number, points: number): number;
  _FPDFAnnot_CountAttachmentPoints?(annot: number): number;
  _FPDFAnnot_GetAttachmentPoints?(annot: number, index: number, points: number): number;
  _FPDFPage_CloseAnnot?(annot: number): void;

  // Forms
  _FPDFDOC_InitFormFillEnvironment?(doc: number, formInfo: number): number;
  _FPDFDOC_ExitFormFillEnvironment?(formHandle: number): void;
  _FPDF_GetFormType?(doc: number): number;
  _FPDFPage_HasFormFieldAtPoint?(formHandle: number, page: number, x: number, y: number): number;
  _FORM_OnMouseMove?(formHandle: number, page: number, modifier: number, x: number, y: number): void;

  // Form fields
  _FPDFAnnot_GetFormFieldType?(formHandle: number, annot: number): number;
  _FPDFAnnot_GetFormFieldName?(formHandle: number, annot: number, buf: number, bufLen: number): number;
  _FPDFAnnot_GetFormFieldValue?(formHandle: number, annot: number, buf: number, bufLen: number): number;
  _FPDFAnnot_SetFormFieldValue?(formHandle: number, annot: number, value: number): void;
  _FPDFAnnot_GetFormFieldFlags?(formHandle: number, annot: number): number;
  _FPDFAnnot_IsChecked?(formHandle: number, annot: number): number;

  // Form flattening
  _FPDFPage_Flatten?(page: number, usage: number): number;

  // Save
  _FPDF_SaveAsCopy?(doc: number, writer: number, flags: number): number;
  _FPDF_SaveWithVersion?(doc: number, writer: number, flags: number, version: number): number;

  // Signatures
  _FPDF_GetSignatureCount?(doc: number): number;
  _FPDF_GetSignatureObject?(doc: number, index: number): number;
  _FPDFSignObj_GetContents?(sig: number, buf: number, bufLen: number): number;
  _FPDFSignObj_GetByteRange?(sig: number, buf: number, bufLen: number): number;
  _FPDFSignObj_GetSubFilter?(sig: number, buf: number, bufLen: number): number;
  _FPDFSignObj_GetReason?(sig: number, buf: number, bufLen: number): number;
  _FPDFSignObj_GetTime?(sig: number, buf: number, bufLen: number): number;
  _FPDFSignObj_GetDocMDPPermission?(sig: number): number;

  // Emscripten utilities
  UTF8ToString(ptr: number): string;
  UTF16ToString(ptr: number): string;
  stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void;
  stringToUTF16(str: string, outPtr: number, maxBytesToWrite: number): void;
  lengthBytesUTF8(str: string): number;
  lengthBytesUTF16(str: string): number;
}

export interface PDFNovaConfig {
  wasmUrl?: string;
  worker?: boolean;
  maxWorkers?: number;
}

// ─── Document ───────────────────────────────────────────────────

export interface OpenOptions {
  password?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  wasmUrl?: string;
  worker?: boolean;
}

export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
}

export interface PDFPermissions {
  print: boolean;
  copy: boolean;
  modify: boolean;
  annotate: boolean;
  fillForms: boolean;
  extractForAccessibility: boolean;
  assemble: boolean;
  printHighQuality: boolean;
}

// ─── Rendering ──────────────────────────────────────────────────

export interface RenderOptions {
  scale?: number;
  rotation?: 0 | 90 | 180 | 270;
  background?: string;
  flags?: number;
}

export const RENDER_FLAG = {
  ANNOT: 0x01,
  LCD_TEXT: 0x02,
  NO_NATIVETEXT: 0x04,
  GRAYSCALE: 0x08,
  REVERSE_BYTE_ORDER: 0x10,
  DEBUG_INFO: 0x80,
  NO_CATCH: 0x100,
  RENDER_LIMITEDIMAGECACHE: 0x200,
  RENDER_FORCEHALFTONE: 0x400,
  PRINTING: 0x800,
  RENDER_NO_SMOOTHTEXT: 0x1000,
  RENDER_NO_SMOOTHIMAGE: 0x2000,
  RENDER_NO_SMOOTHPATH: 0x4000,
} as const;

// ─── Text ───────────────────────────────────────────────────────

export interface TextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  charIndex: number;
  charCount: number;
}

export interface CharBox {
  char: string;
  charCode: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  fontSize: number;
  index: number;
}

export interface SearchResult {
  pageIndex: number;
  matchIndex: number;
  charIndex: number;
  charCount: number;
  rects: TextRect[];
  text: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface TextRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// ─── Navigation ─────────────────────────────────────────────────

export interface OutlineItem {
  title: string;
  pageIndex: number;
  children: OutlineItem[];
}

export interface LinkInfo {
  url: string;
  rects: TextRect[];
  pageIndex: number;
}

// ─── Annotations (full tier) ────────────────────────────────────

export enum AnnotationType {
  Unknown = 0,
  Text = 1,
  Link = 2,
  FreeText = 3,
  Line = 4,
  Square = 5,
  Circle = 6,
  Polygon = 7,
  Polyline = 8,
  Highlight = 9,
  Underline = 10,
  Squiggly = 11,
  StrikeOut = 12,
  Stamp = 13,
  Caret = 14,
  Ink = 15,
  Popup = 16,
  FileAttachment = 17,
  Sound = 18,
  Movie = 19,
  Widget = 20,
  Screen = 21,
  PrinterMark = 22,
  TrapNet = 23,
  Watermark = 24,
  ThreeD = 25,
  RichMedia = 26,
  XFAWidget = 27,
  Redact = 28,
}

export interface AnnotationColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AnnotationRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AttachmentPoint {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export interface AnnotationData {
  index: number;
  type: AnnotationType;
  rect: AnnotationRect;
  color?: AnnotationColor;
  contents?: string;
  author?: string;
  modificationDate?: string;
  attachmentPoints?: AttachmentPoint[];
}

export interface CreateAnnotationOptions {
  type: AnnotationType;
  rect: AnnotationRect;
  color?: AnnotationColor;
  contents?: string;
  attachmentPoints?: AttachmentPoint[];
}

// ─── Forms (full tier) ──────────────────────────────────────────

export enum FormFieldType {
  Unknown = -1,
  PushButton = 0,
  CheckBox = 1,
  RadioButton = 2,
  ComboBox = 3,
  ListBox = 4,
  TextField = 5,
  Signature = 6,
}

export interface FormFieldData {
  name: string;
  type: FormFieldType;
  value: string;
  flags: number;
  isChecked?: boolean;
  pageIndex: number;
  annotIndex: number;
}

export const FLATTEN_USAGE = {
  NORMALONLY: 0,
  PRINT: 1,
} as const;

// ─── Signatures (full tier) ────────────────────────────────────

export interface SignatureData {
  index: number;
  contents: Uint8Array;
  byteRange: number[];
  subFilter: string;
  reason: string;
  signingTime: string;
  docMDPPermission: number;
}

export interface SignatureVerificationResult {
  valid: boolean;
  signer: string;
  reason: string;
  timestamp: string;
  subFilter: string;
  docMDPPermission: number;
  rawContents: Uint8Array;
}

// ─── Virtual Renderer ───────────────────────────────────────────

export interface VirtualRendererOptions {
  container: HTMLElement;
  overscan?: number;
  cacheSize?: number;
  scale?: number;
  gap?: number;
}

// ─── Worker ─────────────────────────────────────────────────────

export type WorkerMessageType =
  | 'init'
  | 'open'
  | 'render'
  | 'getText'
  | 'getTextSpans'
  | 'search'
  | 'close'
  | 'destroy';

export interface WorkerRequest {
  id: number;
  type: WorkerMessageType;
  payload: unknown;
}

export interface WorkerResponse {
  id: number;
  type: 'result' | 'error';
  payload: unknown;
}
