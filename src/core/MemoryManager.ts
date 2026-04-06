import type { WasmModule } from '../types';

interface Allocation {
  ptr: number;
  size: number;
  label?: string;
}

/**
 * Tracks WASM heap allocations and ensures cleanup.
 * Each PDFDocument / PDFPage gets its own MemoryManager scope.
 */
export class MemoryManager {
  private wasm: WasmModule;
  private allocations: Allocation[] = [];
  private disposed = false;

  constructor(wasm: WasmModule) {
    this.wasm = wasm;
  }

  alloc(size: number, label?: string): number {
    if (this.disposed) throw new Error('MemoryManager has been disposed');
    const ptr = this.wasm._malloc(size);
    if (ptr === 0) throw new Error(`WASM allocation failed: ${size} bytes`);
    this.allocations.push({ ptr, size, label });
    return ptr;
  }

  allocF64(label?: string): number {
    return this.alloc(8, label);
  }

  allocI32(label?: string): number {
    return this.alloc(4, label);
  }

  allocBytes(data: Uint8Array, label?: string): number {
    const ptr = this.alloc(data.byteLength, label);
    this.wasm.HEAPU8.set(data, ptr);
    return ptr;
  }

  allocString(str: string, label?: string): number {
    const encoded = new TextEncoder().encode(str);
    const ptr = this.alloc(encoded.length + 1, label);
    this.wasm.HEAPU8.set(encoded, ptr);
    this.wasm.HEAPU8[ptr + encoded.length] = 0;
    return ptr;
  }

  allocUTF16(str: string, label?: string): number {
    const byteLen = (str.length + 1) * 2;
    const ptr = this.alloc(byteLen, label);
    this.wasm.stringToUTF16(str, ptr, byteLen);
    return ptr;
  }

  readF64(ptr: number): number {
    return this.wasm.HEAPF64[ptr >> 3];
  }

  readI32(ptr: number): number {
    return this.wasm.HEAP32[ptr >> 2];
  }

  free(ptr: number): void {
    const idx = this.allocations.findIndex((a) => a.ptr === ptr);
    if (idx >= 0) {
      this.allocations.splice(idx, 1);
    }
    this.wasm._free(ptr);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { ptr } of this.allocations) {
      try {
        this.wasm._free(ptr);
      } catch {
        // best-effort cleanup
      }
    }
    this.allocations.length = 0;
  }

  get allocationCount(): number {
    return this.allocations.length;
  }

  get totalAllocated(): number {
    return this.allocations.reduce((sum, a) => sum + a.size, 0);
  }
}
