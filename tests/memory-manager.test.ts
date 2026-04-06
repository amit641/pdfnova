import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from '../src/core/MemoryManager';
import { WasmLoader } from '../src/core/WasmLoader';
import type { WasmModule } from '../src/types';

describe('MemoryManager', () => {
  let wasm: WasmModule;
  let mem: MemoryManager;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    mem = new MemoryManager(wasm);
  });

  it('allocates and tracks memory', () => {
    const ptr = mem.alloc(64, 'test');
    expect(ptr).toBeGreaterThan(0);
    expect(mem.allocationCount).toBe(1);
    expect(mem.totalAllocated).toBe(64);
  });

  it('allocates strings on the heap', () => {
    const ptr = mem.allocString('hello');
    expect(ptr).toBeGreaterThan(0);
    expect(wasm.UTF8ToString(ptr)).toBe('hello');
  });

  it('allocates UTF-16 strings', () => {
    const ptr = mem.allocUTF16('test');
    expect(ptr).toBeGreaterThan(0);
    expect(wasm.UTF16ToString(ptr)).toBe('test');
  });

  it('allocates bytes from Uint8Array', () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const ptr = mem.allocBytes(data);
    expect(wasm.HEAPU8[ptr]).toBe(1);
    expect(wasm.HEAPU8[ptr + 3]).toBe(4);
  });

  it('reads F64 and I32 values', () => {
    const f64Ptr = mem.allocF64();
    wasm.HEAPF64[f64Ptr >> 3] = 3.14;
    expect(mem.readF64(f64Ptr)).toBeCloseTo(3.14);

    const i32Ptr = mem.allocI32();
    wasm.HEAP32[i32Ptr >> 2] = 42;
    expect(mem.readI32(i32Ptr)).toBe(42);
  });

  it('frees individual allocations', () => {
    const ptr = mem.alloc(32);
    expect(mem.allocationCount).toBe(1);
    mem.free(ptr);
    expect(mem.allocationCount).toBe(0);
  });

  it('dispose frees all allocations', () => {
    mem.alloc(32);
    mem.alloc(64);
    mem.alloc(128);
    expect(mem.allocationCount).toBe(3);

    mem.dispose();
    expect(mem.allocationCount).toBe(0);
  });

  it('throws after dispose', () => {
    mem.dispose();
    expect(() => mem.alloc(32)).toThrow('MemoryManager has been disposed');
  });
});
