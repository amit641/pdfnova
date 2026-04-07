import type {
  WasmModule,
  RenderOptions,
  TextSpan,
  CharBox,
  SearchResult,
  SearchOptions,
  AnnotationData,
  CreateAnnotationOptions,
  LinkInfo,
} from '../types';
import { RENDER_FLAG } from '../types';
import { WasmBridge } from '../core/WasmBridge';
import { MemoryManager } from '../core/MemoryManager';
import { TextExtractor } from '../text/TextExtractor';
import { TextLayerBuilder } from '../text/TextLayerBuilder';
import { SearchEngine } from '../text/SearchEngine';
import { LinkExtractor } from '../navigation/LinkExtractor';
import { requireFull } from '../capabilities';

export class PDFPage {
  private wasm: WasmModule;
  private bridge: WasmBridge;
  private docPtr: number;
  private _pageIndex: number;
  private pagePtr: number = 0;
  private textPagePtr: number = 0;
  private _formHandle: number | null;
  private _closed = false;
  private mem: MemoryManager;

  constructor(
    wasm: WasmModule,
    bridge: WasmBridge,
    docPtr: number,
    pageIndex: number,
    formHandle: number | null,
  ) {
    this.wasm = wasm;
    this.bridge = bridge;
    this.docPtr = docPtr;
    this._pageIndex = pageIndex;
    this._formHandle = formHandle;
    this.mem = new MemoryManager(wasm);
    this._load();
  }

  private _load(): void {
    this.pagePtr = this.wasm._FPDF_LoadPage(this.docPtr, this._pageIndex);
    if (this.pagePtr === 0) {
      throw new Error(`Failed to load page ${this._pageIndex}`);
    }
  }

  // ─── Properties ──────────────────────────────────────────────

  get pageIndex(): number {
    return this._pageIndex;
  }

  get formHandle(): number | null {
    return this._formHandle;
  }

  get width(): number {
    this._assertOpen();
    return this.wasm._FPDF_GetPageWidthF(this.pagePtr);
  }

  get height(): number {
    this._assertOpen();
    return this.wasm._FPDF_GetPageHeightF(this.pagePtr);
  }

  // ─── Rendering ───────────────────────────────────────────────

  async render(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options?: RenderOptions,
  ): Promise<void> {
    this._assertOpen();

    const scale = options?.scale ?? 1.0;
    const rotation = options?.rotation ?? 0;
    const rotationIndex = [0, 90, 180, 270].indexOf(rotation);
    if (rotationIndex < 0) throw new RangeError('Rotation must be 0, 90, 180, or 270');

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const pdfW = this.width;
    const pdfH = this.height;
    const renderW = Math.ceil((isRotated90or270 ? pdfH : pdfW) * scale);
    const renderH = Math.ceil((isRotated90or270 ? pdfW : pdfH) * scale);

    canvas.width = renderW;
    canvas.height = renderH;

    const baseFlags = options?.flags ?? (RENDER_FLAG.ANNOT | RENDER_FLAG.LCD_TEXT);
    const flags = baseFlags | RENDER_FLAG.REVERSE_BYTE_ORDER;

    const bitmapHandle = this.wasm._FPDFBitmap_Create(renderW, renderH, 0);
    if (bitmapHandle === 0) throw new Error('Failed to create bitmap');

    try {
      const bgColor = PDFPage._parseColor(options?.background ?? '#ffffff');
      this.wasm._FPDFBitmap_FillRect(bitmapHandle, 0, 0, renderW, renderH, bgColor);
      this.wasm._FPDF_RenderPageBitmap(
        bitmapHandle, this.pagePtr,
        0, 0, renderW, renderH,
        rotationIndex, flags,
      );

      const bufferPtr = this.wasm._FPDFBitmap_GetBuffer(bitmapHandle);
      const stride = this.wasm._FPDFBitmap_GetStride(bitmapHandle);

      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      if (!ctx) throw new Error('Failed to get canvas 2D context');

      const imageData = ctx.createImageData(renderW, renderH);
      const dst = imageData.data;
      const rowBytes = renderW * 4;

      // REVERSE_BYTE_ORDER makes PDFium output RGBA directly — bulk copy per row
      for (let y = 0; y < renderH; y++) {
        const srcOffset = bufferPtr + y * stride;
        const dstOffset = y * rowBytes;
        dst.set(this.wasm.HEAPU8.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
        // Force full opacity on each pixel (PDFium uses BGRx with alpha=0)
        for (let x = 3; x < rowBytes; x += 4) {
          dst[dstOffset + x] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    } finally {
      this.wasm._FPDFBitmap_Destroy(bitmapHandle);
    }
  }

  async renderToImageData(options?: RenderOptions): Promise<ImageData> {
    this._assertOpen();

    const scale = options?.scale ?? 1.0;
    const rotation = options?.rotation ?? 0;
    const rotationIndex = [0, 90, 180, 270].indexOf(rotation);
    if (rotationIndex < 0) throw new RangeError('Rotation must be 0, 90, 180, or 270');

    const isRotated = rotation === 90 || rotation === 270;
    const renderW = Math.ceil((isRotated ? this.height : this.width) * scale);
    const renderH = Math.ceil((isRotated ? this.width : this.height) * scale);

    const baseFlags = options?.flags ?? (RENDER_FLAG.ANNOT | RENDER_FLAG.LCD_TEXT);
    const flags = baseFlags | RENDER_FLAG.REVERSE_BYTE_ORDER;
    const bitmapHandle = this.wasm._FPDFBitmap_Create(renderW, renderH, 0);
    if (bitmapHandle === 0) throw new Error('Failed to create bitmap');

    try {
      const bgColor = PDFPage._parseColor(options?.background ?? '#ffffff');
      this.wasm._FPDFBitmap_FillRect(bitmapHandle, 0, 0, renderW, renderH, bgColor);
      this.wasm._FPDF_RenderPageBitmap(
        bitmapHandle, this.pagePtr,
        0, 0, renderW, renderH,
        rotationIndex, flags,
      );

      const bufferPtr = this.wasm._FPDFBitmap_GetBuffer(bitmapHandle);
      const stride = this.wasm._FPDFBitmap_GetStride(bitmapHandle);
      const data = new Uint8ClampedArray(renderW * renderH * 4);
      const rowBytes = renderW * 4;

      for (let y = 0; y < renderH; y++) {
        const srcOffset = bufferPtr + y * stride;
        const dstOffset = y * rowBytes;
        data.set(this.wasm.HEAPU8.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
        for (let x = 3; x < rowBytes; x += 4) {
          data[dstOffset + x] = 255;
        }
      }

      return new ImageData(data, renderW, renderH);
    } finally {
      this.wasm._FPDFBitmap_Destroy(bitmapHandle);
    }
  }

  // ─── Text ────────────────────────────────────────────────────

  getText(): string {
    this._assertOpen();
    this._ensureTextPage();
    const extractor = new TextExtractor(this.wasm, this.bridge);
    return extractor.extractText(this.textPagePtr);
  }

  getTextSpans(): TextSpan[] {
    this._assertOpen();
    this._ensureTextPage();
    const extractor = new TextExtractor(this.wasm, this.bridge);
    return extractor.extractSpans(this.textPagePtr);
  }

  getCharBoxes(): CharBox[] {
    this._assertOpen();
    this._ensureTextPage();
    const extractor = new TextExtractor(this.wasm, this.bridge);
    return extractor.extractCharBoxes(this.textPagePtr);
  }

  createTextLayer(container: HTMLElement): HTMLElement {
    this._assertOpen();
    this._ensureTextPage();
    const builder = new TextLayerBuilder(this.wasm, this.bridge);
    return builder.build(this.textPagePtr, container, this.width, this.height);
  }

  // ─── Search ──────────────────────────────────────────────────

  search(query: string, options?: SearchOptions): SearchResult[] {
    this._assertOpen();
    this._ensureTextPage();
    const engine = new SearchEngine(this.wasm, this.bridge);
    return engine.searchPage(this.textPagePtr, this._pageIndex, query, options);
  }

  // ─── Links ───────────────────────────────────────────────────

  getLinks(): LinkInfo[] {
    this._assertOpen();
    this._ensureTextPage();
    const extractor = new LinkExtractor(this.wasm, this.bridge);
    return extractor.extractLinks(this.textPagePtr, this._pageIndex);
  }

  // ─── Annotations (full tier) ─────────────────────────────────

  async getAnnotations(): Promise<AnnotationData[]> {
    requireFull('Annotation reading');
    this._assertOpen();

    const { AnnotationReader } = await import('../annotations/AnnotationReader');
    const reader = new AnnotationReader(this.wasm, this.bridge);
    return reader.readAnnotations(this.pagePtr);
  }

  async addAnnotation(opts: CreateAnnotationOptions): Promise<void> {
    requireFull('Annotation creation');
    this._assertOpen();

    const { AnnotationWriter } = await import('../annotations/AnnotationWriter');
    const writer = new AnnotationWriter(this.wasm, this.bridge);
    writer.addAnnotation(this.pagePtr, opts);
  }

  async removeAnnotation(index: number): Promise<void> {
    requireFull('Annotation removal');
    this._assertOpen();

    const { AnnotationWriter } = await import('../annotations/AnnotationWriter');
    const writer = new AnnotationWriter(this.wasm, this.bridge);
    writer.removeAnnotation(this.pagePtr, index);
  }

  // ─── Cleanup ─────────────────────────────────────────────────

  close(): void {
    if (this._closed) return;
    this._closed = true;

    if (this.textPagePtr) {
      this.wasm._FPDFText_ClosePage(this.textPagePtr);
      this.textPagePtr = 0;
    }
    if (this.pagePtr) {
      this.wasm._FPDF_ClosePage(this.pagePtr);
      this.pagePtr = 0;
    }

    this.mem.dispose();
  }

  [Symbol.dispose](): void {
    this.close();
  }

  // ─── Internal ────────────────────────────────────────────────

  private _ensureTextPage(): void {
    if (this.textPagePtr) return;
    this.textPagePtr = this.wasm._FPDFText_LoadPage(this.pagePtr);
    if (this.textPagePtr === 0) {
      throw new Error(`Failed to load text page for page ${this._pageIndex}`);
    }
  }

  private _assertOpen(): void {
    if (this._closed) throw new Error('Page has been closed');
  }

  private static _parseColor(hex: string): number {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const a = clean.length > 6 ? parseInt(clean.slice(6, 8), 16) : 255;
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  }
}
