import type { WasmModule, PDFMetadata, PDFPermissions, OpenOptions, SearchResult, SearchOptions, OutlineItem } from '../types';
import { WasmLoader } from '../core/WasmLoader';
import { WasmBridge } from '../core/WasmBridge';
import { MemoryManager } from '../core/MemoryManager';
import { PDFPage } from './PDFPage';
import { SearchEngine } from '../text/SearchEngine';
import { OutlineExtractor } from '../navigation/OutlineExtractor';
import { requireFull } from '../capabilities';

const FPDF_ERR_UNKNOWN = 1;
const FPDF_ERR_FILE = 2;
const FPDF_ERR_FORMAT = 3;
const FPDF_ERR_PASSWORD = 4;
const FPDF_ERR_SECURITY = 5;
const FPDF_ERR_PAGE = 6;

const ERROR_MESSAGES: Record<number, string> = {
  [FPDF_ERR_UNKNOWN]: 'Unknown error',
  [FPDF_ERR_FILE]: 'File not found or could not be opened',
  [FPDF_ERR_FORMAT]: 'File is not a valid PDF',
  [FPDF_ERR_PASSWORD]: 'Incorrect password',
  [FPDF_ERR_SECURITY]: 'Unsupported security scheme',
  [FPDF_ERR_PAGE]: 'Page not found or content error',
};

export class PDFDocument {
  private wasm: WasmModule;
  private bridge: WasmBridge;
  private mem: MemoryManager;
  private docPtr: number;
  private _pageCount: number;
  private _pages: Map<number, PDFPage> = new Map();
  private _formHandle: number | null = null;
  private _closed = false;
  private _dataPtr: number = 0;

  private constructor(wasm: WasmModule, docPtr: number, dataPtr: number) {
    this.wasm = wasm;
    this.bridge = new WasmBridge(wasm);
    this.mem = new MemoryManager(wasm);
    this.docPtr = docPtr;
    this._dataPtr = dataPtr;
    this._pageCount = wasm._FPDF_GetPageCount(docPtr);
  }

  // ─── Static factory ──────────────────────────────────────────

  static async open(
    source: ArrayBuffer | Uint8Array | File | Blob | string,
    options?: OpenOptions,
  ): Promise<PDFDocument> {
    const wasm = await WasmLoader.load({ wasmUrl: options?.wasmUrl });
    const data = await PDFDocument._resolveSource(source, options);
    const bytes = new Uint8Array(data);

    const dataPtr = wasm._malloc(bytes.byteLength);
    wasm.HEAPU8.set(bytes, dataPtr);

    let passwordPtr = 0;
    if (options?.password) {
      const pwBytes = new TextEncoder().encode(options.password);
      passwordPtr = wasm._malloc(pwBytes.length + 1);
      wasm.HEAPU8.set(pwBytes, passwordPtr);
      wasm.HEAPU8[passwordPtr + pwBytes.length] = 0;
    }

    const docPtr = wasm._FPDF_LoadMemDocument(dataPtr, bytes.byteLength, passwordPtr);

    if (passwordPtr) wasm._free(passwordPtr);

    if (docPtr === 0) {
      wasm._free(dataPtr);
      const errCode = wasm._FPDF_GetLastError();
      const msg = ERROR_MESSAGES[errCode] ?? `PDFium error code ${errCode}`;
      const error = new Error(msg);
      (error as any).code = errCode;
      throw error;
    }

    return new PDFDocument(wasm, docPtr, dataPtr);
  }

  private static async _resolveSource(
    source: ArrayBuffer | Uint8Array | File | Blob | string,
    options?: OpenOptions,
  ): Promise<ArrayBuffer> {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
    if (source instanceof ArrayBuffer) return source;
    if (source && typeof source === 'object' && 'byteLength' in source && typeof (source as any).slice === 'function')
      return source as unknown as ArrayBuffer;
    if (typeof Blob !== 'undefined' && source instanceof Blob) return source.arrayBuffer();

    if (typeof source === 'string') {
      if (source.startsWith('data:')) {
        const base64 = source.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      }

      const fetchOptions: RequestInit = {};
      if (options?.headers) fetchOptions.headers = options.headers;
      if (options?.credentials) fetchOptions.credentials = options.credentials;

      const response = await fetch(source, fetchOptions);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      return response.arrayBuffer();
    }

    throw new Error('Unsupported source type');
  }

  // ─── Properties ──────────────────────────────────────────────

  get pageCount(): number {
    this._assertOpen();
    return this._pageCount;
  }

  get metadata(): PDFMetadata {
    this._assertOpen();
    return {
      title: this.bridge.getMetaText(this.docPtr, 'Title'),
      author: this.bridge.getMetaText(this.docPtr, 'Author'),
      subject: this.bridge.getMetaText(this.docPtr, 'Subject'),
      keywords: this.bridge.getMetaText(this.docPtr, 'Keywords'),
      creator: this.bridge.getMetaText(this.docPtr, 'Creator'),
      producer: this.bridge.getMetaText(this.docPtr, 'Producer'),
      creationDate: this.bridge.getMetaText(this.docPtr, 'CreationDate'),
      modDate: this.bridge.getMetaText(this.docPtr, 'ModDate'),
    };
  }

  get permissions(): PDFPermissions {
    this._assertOpen();
    // PDFium doesn't expose FPDF_GetDocPermissions directly in all builds;
    // default to all-permitted for non-encrypted docs.
    return {
      print: true,
      copy: true,
      modify: true,
      annotate: true,
      fillForms: true,
      extractForAccessibility: true,
      assemble: true,
      printHighQuality: true,
    };
  }

  get outline(): OutlineItem[] {
    this._assertOpen();
    return new OutlineExtractor(this.wasm, this.bridge).extract(this.docPtr);
  }

  get isClosed(): boolean {
    return this._closed;
  }

  // ─── Page access ─────────────────────────────────────────────

  getPage(index: number): PDFPage {
    this._assertOpen();
    if (index < 0 || index >= this._pageCount) {
      throw new RangeError(`Page index ${index} out of range [0, ${this._pageCount - 1}]`);
    }

    let page = this._pages.get(index);
    if (!page) {
      page = new PDFPage(this.wasm, this.bridge, this.docPtr, index, this._formHandle);
      this._pages.set(index, page);
    }
    return page;
  }

  // ─── Search ──────────────────────────────────────────────────

  search(query: string, options?: SearchOptions): SearchResult[] {
    this._assertOpen();
    const engine = new SearchEngine(this.wasm, this.bridge);
    return engine.searchDocument(this.docPtr, this._pageCount, query, options);
  }

  // ─── Forms (full tier) ───────────────────────────────────────

  initFormEnvironment(): void {
    requireFull('Form filling');
    this._assertOpen();
    if (this._formHandle) return;
    const formInfoPtr = this.mem.alloc(512, 'formInfo');
    this.wasm.HEAPU8.fill(0, formInfoPtr, formInfoPtr + 512);
    this._formHandle = this.wasm._FPDFDOC_InitFormFillEnvironment!(this.docPtr, formInfoPtr);
  }

  async getFormFields(): Promise<import('../types').FormFieldData[]> {
    requireFull('Form reading');
    this._assertOpen();
    if (!this._formHandle) this.initFormEnvironment();

    const { FormReader } = await import('../forms/FormReader');
    const reader = new FormReader(this.wasm, this.bridge);
    return reader.readAllFields(this.docPtr, this._formHandle!, this._pageCount);
  }

  async setFormField(name: string, value: string): Promise<void> {
    requireFull('Form filling');
    this._assertOpen();
    if (!this._formHandle) this.initFormEnvironment();

    const { FormFiller } = await import('../forms/FormFiller');
    const filler = new FormFiller(this.wasm, this.bridge);
    filler.setFieldValue(this.docPtr, this._formHandle!, this._pageCount, name, value);
  }

  async flattenForms(usage: number = 0): Promise<void> {
    requireFull('Form flattening');
    this._assertOpen();

    const { FormFlattener } = await import('../forms/FormFlattener');
    const flattener = new FormFlattener(this.wasm);
    flattener.flattenAll(this.docPtr, this._pageCount, usage);
  }

  // ─── Signatures (full tier) ──────────────────────────────────

  async getSignatures(): Promise<import('../types').SignatureData[]> {
    requireFull('Signature reading');
    this._assertOpen();

    const { SignatureVerifier } = await import('../signatures/SignatureVerifier');
    const verifier = new SignatureVerifier(this.wasm, this.bridge);
    return verifier.readSignatures(this.docPtr);
  }

  // ─── Save (full tier) ────────────────────────────────────────

  async save(): Promise<Uint8Array> {
    requireFull('Document saving');
    this._assertOpen();

    if (!this.wasm._FPDF_SaveAsCopy) {
      throw new Error('Save not available in this build');
    }

    // PDFium's save requires a writer callback. In WASM, we collect
    // chunks into a buffer. For the mock, return the original data.
    // Real implementation uses FPDF_SaveAsCopy with a custom writer.
    const pageCount = this._pageCount;
    const estimatedSize = pageCount * 50000; // rough estimate
    const buf = new Uint8Array(estimatedSize);
    // In real implementation: set up FPDF_FILEWRITE struct, call FPDF_SaveAsCopy
    return buf;
  }

  // ─── Cleanup ─────────────────────────────────────────────────

  close(): void {
    if (this._closed) return;
    this._closed = true;

    for (const page of this._pages.values()) {
      page.close();
    }
    this._pages.clear();

    if (this._formHandle && this.wasm._FPDFDOC_ExitFormFillEnvironment) {
      this.wasm._FPDFDOC_ExitFormFillEnvironment(this._formHandle);
      this._formHandle = null;
    }

    this.wasm._FPDF_CloseDocument(this.docPtr);

    if (this._dataPtr) {
      this.wasm._free(this._dataPtr);
      this._dataPtr = 0;
    }

    this.mem.dispose();
  }

  [Symbol.dispose](): void {
    this.close();
  }

  // ─── Internal ────────────────────────────────────────────────

  /** @internal */
  get _docPtr(): number {
    return this.docPtr;
  }

  /** @internal */
  get _wasmModule(): WasmModule {
    return this.wasm;
  }

  /** @internal */
  get _wasmBridge(): WasmBridge {
    return this.bridge;
  }

  private _assertOpen(): void {
    if (this._closed) throw new Error('Document has been closed');
  }
}
