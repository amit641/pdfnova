import { describe, it, expect, beforeEach } from 'vitest';
import { WasmLoader } from '../src/core/WasmLoader';

describe('WasmLoader', () => {
  beforeEach(() => {
    WasmLoader.reset();
  });

  it('loads WASM module successfully', async () => {
    const wasm = await WasmLoader.load();
    expect(wasm).toBeDefined();
    expect(typeof wasm._malloc).toBe('function');
    expect(typeof wasm._free).toBe('function');
    expect(typeof wasm._FPDF_LoadMemDocument).toBe('function');
  });

  it('returns same instance on subsequent calls', async () => {
    const wasm1 = await WasmLoader.load();
    const wasm2 = await WasmLoader.load();
    expect(wasm1).toBe(wasm2);
  });

  it('isLoaded returns correct state', async () => {
    expect(WasmLoader.isLoaded()).toBe(false);
    await WasmLoader.load();
    expect(WasmLoader.isLoaded()).toBe(true);
  });

  it('reset clears the instance', async () => {
    await WasmLoader.load();
    expect(WasmLoader.isLoaded()).toBe(true);

    WasmLoader.reset();
    expect(WasmLoader.isLoaded()).toBe(false);
    expect(WasmLoader.getInstance()).toBeNull();
  });

  it('exports core PDFium functions', async () => {
    const wasm = await WasmLoader.load();
    const coreFunctions = [
      '_FPDF_InitLibraryWithConfig',
      '_FPDF_DestroyLibrary',
      '_FPDF_LoadMemDocument',
      '_FPDF_CloseDocument',
      '_FPDF_GetPageCount',
      '_FPDF_LoadPage',
      '_FPDF_ClosePage',
      '_FPDFBitmap_Create',
      '_FPDF_RenderPageBitmap',
      '_FPDFText_LoadPage',
      '_FPDFText_CountChars',
      '_FPDFBookmark_GetFirstChild',
    ];

    for (const fn of coreFunctions) {
      expect(typeof (wasm as any)[fn]).toBe('function');
    }
  });

  it('exports Emscripten utility functions', async () => {
    const wasm = await WasmLoader.load();
    expect(typeof wasm.UTF8ToString).toBe('function');
    expect(typeof wasm.UTF16ToString).toBe('function');
    expect(typeof wasm.stringToUTF8).toBe('function');
    expect(typeof wasm.stringToUTF16).toBe('function');
  });
});
