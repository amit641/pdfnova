import type { WasmModule, WasmTier } from './types';

let currentTier: WasmTier = 'lite';

export function setTier(tier: WasmTier): void {
  currentTier = tier;
}

export function getTier(): WasmTier {
  return currentTier;
}

export function isFullTier(): boolean {
  return currentTier === 'full';
}

export function requireFull(feature: string): void {
  if (currentTier !== 'full') {
    throw new Error(
      `${feature} requires the full build of pdfnova. ` +
        `Import from 'pdfnova' instead of 'pdfnova/lite'.`,
    );
  }
}

export function hasAnnotationSupport(wasm: WasmModule): boolean {
  return typeof wasm._FPDFPage_GetAnnotCount === 'function';
}

export function hasFormSupport(wasm: WasmModule): boolean {
  return typeof wasm._FPDFDOC_InitFormFillEnvironment === 'function';
}

export function hasSignatureSupport(wasm: WasmModule): boolean {
  return typeof wasm._FPDF_GetSignatureCount === 'function';
}

export function hasSaveSupport(wasm: WasmModule): boolean {
  return typeof wasm._FPDF_SaveAsCopy === 'function';
}
