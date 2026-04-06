import type { WasmModule } from '../types';
import { WasmLoader } from './WasmLoader';

/**
 * Low-level bridge providing typed helpers around raw PDFium C API calls.
 * All pointer management goes through this layer.
 */
export class WasmBridge {
  private wasm: WasmModule;

  constructor(wasm?: WasmModule) {
    this.wasm = wasm ?? WasmLoader.getInstance()!;
  }

  get module(): WasmModule {
    return this.wasm;
  }

  allocateString(str: string): number {
    const len = this.wasm.lengthBytesUTF8(str) + 1;
    const ptr = this.wasm._malloc(len);
    this.wasm.stringToUTF8(str, ptr, len);
    return ptr;
  }

  allocateUTF16String(str: string): number {
    const byteLen = (str.length + 1) * 2;
    const ptr = this.wasm._malloc(byteLen);
    this.wasm.stringToUTF16(str, ptr, byteLen);
    return ptr;
  }

  readString(ptr: number): string {
    return this.wasm.UTF8ToString(ptr);
  }

  readUTF16String(ptr: number): string {
    return this.wasm.UTF16ToString(ptr);
  }

  copyToHeap(data: Uint8Array): number {
    const ptr = this.wasm._malloc(data.byteLength);
    this.wasm.HEAPU8.set(data, ptr);
    return ptr;
  }

  copyFromHeap(ptr: number, size: number): Uint8Array {
    return new Uint8Array(this.wasm.HEAPU8.buffer, ptr, size).slice();
  }

  allocateF64(): number {
    return this.wasm._malloc(8);
  }

  readF64(ptr: number): number {
    return this.wasm.HEAPF64[ptr >> 3];
  }

  allocateI32(): number {
    return this.wasm._malloc(4);
  }

  readI32(ptr: number): number {
    return this.wasm.HEAP32[ptr >> 2];
  }

  free(ptr: number): void {
    this.wasm._free(ptr);
  }

  freeAll(...ptrs: number[]): void {
    for (const ptr of ptrs) {
      if (ptr) this.wasm._free(ptr);
    }
  }

  getMetaText(docPtr: number, tag: string): string {
    const tagPtr = this.allocateString(tag);

    const needed = this.wasm._FPDF_GetMetaText(docPtr, tagPtr, 0, 0);
    if (needed <= 0) {
      this.free(tagPtr);
      return '';
    }

    const buf = this.wasm._malloc(needed);
    this.wasm._FPDF_GetMetaText(docPtr, tagPtr, buf, needed);
    const value = this.readUTF16String(buf);

    this.freeAll(tagPtr, buf);
    return value;
  }

  getBookmarkTitle(bookmark: number): string {
    const needed = this.wasm._FPDFBookmark_GetTitle(bookmark, 0, 0);
    if (needed <= 0) return '';
    const buf = this.wasm._malloc(needed);
    this.wasm._FPDFBookmark_GetTitle(bookmark, buf, needed);
    const title = this.readUTF16String(buf);
    this.free(buf);
    return title;
  }

  getLinkURL(linkPage: number, linkIndex: number): string {
    const needed = this.wasm._FPDFLink_GetURL(linkPage, linkIndex, 0, 0);
    if (needed <= 0) return '';
    const buf = this.wasm._malloc(needed * 2);
    this.wasm._FPDFLink_GetURL(linkPage, linkIndex, buf, needed);
    const url = this.readUTF16String(buf);
    this.free(buf);
    return url;
  }

  getAnnotStringValue(annot: number, key: string): string {
    if (!this.wasm._FPDFAnnot_GetStringValue) return '';
    const keyPtr = this.allocateString(key);
    const needed = this.wasm._FPDFAnnot_GetStringValue(annot, keyPtr, 0, 0);
    if (needed <= 0) {
      this.free(keyPtr);
      return '';
    }
    const buf = this.wasm._malloc(needed);
    this.wasm._FPDFAnnot_GetStringValue(annot, keyPtr, buf, needed);
    const value = this.readUTF16String(buf);
    this.freeAll(keyPtr, buf);
    return value;
  }

  getFormFieldName(formHandle: number, annot: number): string {
    if (!this.wasm._FPDFAnnot_GetFormFieldName) return '';
    const needed = this.wasm._FPDFAnnot_GetFormFieldName(formHandle, annot, 0, 0);
    if (needed <= 0) return '';
    const buf = this.wasm._malloc(needed);
    this.wasm._FPDFAnnot_GetFormFieldName(formHandle, annot, buf, needed);
    const name = this.readUTF16String(buf);
    this.free(buf);
    return name;
  }

  getFormFieldValue(formHandle: number, annot: number): string {
    if (!this.wasm._FPDFAnnot_GetFormFieldValue) return '';
    const needed = this.wasm._FPDFAnnot_GetFormFieldValue(formHandle, annot, 0, 0);
    if (needed <= 0) return '';
    const buf = this.wasm._malloc(needed);
    this.wasm._FPDFAnnot_GetFormFieldValue(formHandle, annot, buf, needed);
    const value = this.readUTF16String(buf);
    this.free(buf);
    return value;
  }

  getSignatureStringField(sig: number, getter: (sig: number, buf: number, bufLen: number) => number): string {
    const needed = getter(sig, 0, 0);
    if (needed <= 0) return '';
    const buf = this.wasm._malloc(needed);
    getter(sig, buf, needed);
    const value = this.readString(buf);
    this.free(buf);
    return value;
  }

  getSignatureBinaryField(sig: number, getter: (sig: number, buf: number, bufLen: number) => number): Uint8Array {
    const needed = getter(sig, 0, 0);
    if (needed <= 0) return new Uint8Array(0);
    const buf = this.wasm._malloc(needed);
    getter(sig, buf, needed);
    const data = this.copyFromHeap(buf, needed);
    this.free(buf);
    return data;
  }
}
