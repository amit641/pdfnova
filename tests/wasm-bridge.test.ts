import { describe, it, expect, beforeEach } from 'vitest';
import { WasmBridge } from '../src/core/WasmBridge';
import { WasmLoader } from '../src/core/WasmLoader';
import type { WasmModule } from '../src/types';

describe('WasmBridge', () => {
  let wasm: WasmModule;
  let bridge: WasmBridge;

  beforeEach(async () => {
    WasmLoader.reset();
    wasm = await WasmLoader.load();
    bridge = new WasmBridge(wasm);
  });

  it('allocates and reads UTF-8 strings', () => {
    const ptr = bridge.allocateString('hello world');
    expect(bridge.readString(ptr)).toBe('hello world');
    bridge.free(ptr);
  });

  it('allocates and reads UTF-16 strings', () => {
    const ptr = bridge.allocateUTF16String('pdfnova');
    expect(bridge.readUTF16String(ptr)).toBe('pdfnova');
    bridge.free(ptr);
  });

  it('copies data to and from heap', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    const ptr = bridge.copyToHeap(data);

    const copied = bridge.copyFromHeap(ptr, 5);
    expect(copied).toEqual(data);
    bridge.free(ptr);
  });

  it('allocates and reads F64 values', () => {
    const ptr = bridge.allocateF64();
    wasm.HEAPF64[ptr >> 3] = 2.71828;
    expect(bridge.readF64(ptr)).toBeCloseTo(2.71828);
    bridge.free(ptr);
  });

  it('allocates and reads I32 values', () => {
    const ptr = bridge.allocateI32();
    wasm.HEAP32[ptr >> 2] = -999;
    expect(bridge.readI32(ptr)).toBe(-999);
    bridge.free(ptr);
  });

  it('freeAll releases multiple pointers', () => {
    const p1 = bridge.allocateString('a');
    const p2 = bridge.allocateString('b');
    const p3 = bridge.allocateString('c');
    expect(() => bridge.freeAll(p1, p2, p3)).not.toThrow();
  });

  it('exposes the underlying module', () => {
    expect(bridge.module).toBe(wasm);
  });
});
