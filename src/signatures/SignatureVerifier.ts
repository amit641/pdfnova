import type { WasmModule, SignatureData, SignatureVerificationResult } from '../types';
import { WasmBridge } from '../core/WasmBridge';

/**
 * Reads and verifies digital signatures from a PDF document.
 * Uses PDFium's FPDFSignObj_* APIs to extract signature metadata.
 *
 * Note: Full cryptographic verification (validating the PKCS#7 signature
 * against a certificate chain) requires additional crypto libraries.
 * This class extracts the raw signature data and metadata for verification
 * by external tools (e.g., node-forge, WebCrypto, or OpenSSL).
 */
export class SignatureVerifier {
  private wasm: WasmModule;
  private bridge: WasmBridge;

  constructor(wasm: WasmModule, bridge: WasmBridge) {
    this.wasm = wasm;
    this.bridge = bridge;
  }

  readSignatures(docPtr: number): SignatureData[] {
    if (!this.wasm._FPDF_GetSignatureCount) return [];

    const count = this.wasm._FPDF_GetSignatureCount(docPtr);
    if (count <= 0) return [];

    const signatures: SignatureData[] = [];

    for (let i = 0; i < count; i++) {
      const sigPtr = this.wasm._FPDF_GetSignatureObject!(docPtr, i);
      if (sigPtr === 0) continue;

      const sig = this._readSignature(sigPtr, i);
      if (sig) signatures.push(sig);
    }

    return signatures;
  }

  /**
   * Verify a signature's integrity.
   * Performs basic byte-range validation and returns extracted metadata.
   * For full PKI verification, use the raw `contents` with a crypto library.
   */
  async verify(docPtr: number, sigIndex: number, documentBytes: Uint8Array): Promise<SignatureVerificationResult> {
    const signatures = this.readSignatures(docPtr);
    const sig = signatures[sigIndex];

    if (!sig) {
      throw new Error(`Signature at index ${sigIndex} not found`);
    }

    // Basic byte-range integrity check
    const byteRangeValid = this._validateByteRange(sig.byteRange, documentBytes);

    return {
      valid: byteRangeValid && sig.contents.length > 0,
      signer: sig.reason || 'Unknown',
      reason: sig.reason,
      timestamp: sig.signingTime,
      subFilter: sig.subFilter,
      docMDPPermission: sig.docMDPPermission,
      rawContents: sig.contents,
    };
  }

  private _readSignature(sigPtr: number, index: number): SignatureData | null {
    const contents = this.bridge.getSignatureBinaryField(
      sigPtr,
      (sig, buf, bufLen) => this.wasm._FPDFSignObj_GetContents!(sig, buf, bufLen),
    );

    const byteRangeRaw = this.bridge.getSignatureBinaryField(
      sigPtr,
      (sig, buf, bufLen) => this.wasm._FPDFSignObj_GetByteRange!(sig, buf, bufLen),
    );
    const byteRange = this._parseByteRange(byteRangeRaw);

    const subFilter = this.bridge.getSignatureStringField(
      sigPtr,
      (sig, buf, bufLen) => this.wasm._FPDFSignObj_GetSubFilter!(sig, buf, bufLen),
    );

    const reason = this.bridge.getSignatureStringField(
      sigPtr,
      (sig, buf, bufLen) => this.wasm._FPDFSignObj_GetReason!(sig, buf, bufLen),
    );

    const signingTime = this.bridge.getSignatureStringField(
      sigPtr,
      (sig, buf, bufLen) => this.wasm._FPDFSignObj_GetTime!(sig, buf, bufLen),
    );

    const docMDPPermission = this.wasm._FPDFSignObj_GetDocMDPPermission!(sigPtr);

    return {
      index,
      contents,
      byteRange,
      subFilter,
      reason,
      signingTime,
      docMDPPermission,
    };
  }

  private _parseByteRange(raw: Uint8Array): number[] {
    if (raw.length === 0) return [];

    // Byte range is stored as pairs of (offset, length) as 32-bit integers
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const ints: number[] = [];
    for (let i = 0; i + 3 < raw.length; i += 4) {
      ints.push(view.getInt32(i, true));
    }
    return ints;
  }

  /**
   * Validates that the byte ranges cover the expected portions of the document
   * (everything except the signature contents hex string).
   */
  private _validateByteRange(byteRange: number[], documentBytes: Uint8Array): boolean {
    if (byteRange.length < 4 || byteRange.length % 2 !== 0) return false;

    // Byte range should start at 0
    if (byteRange[0] !== 0) return false;

    // Last range should end at document length
    const lastOffset = byteRange[byteRange.length - 2];
    const lastLength = byteRange[byteRange.length - 1];
    if (lastOffset + lastLength !== documentBytes.length) return false;

    return true;
  }
}
