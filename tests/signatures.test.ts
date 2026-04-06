import { describe, it, expect, beforeEach } from 'vitest';
import { setTier } from '../src/capabilities';
import { WasmLoader } from '../src/core/WasmLoader';
import { PDFDocument } from '../src/document/PDFDocument';
import { SignatureInfo } from '../src/signatures/SignatureInfo';
import { createMinimalPDF } from './helpers';

describe('Signatures (full tier)', () => {
  beforeEach(() => {
    WasmLoader.reset();
    setTier('full');
  });

  it('getSignatures returns array', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const sigs = await doc.getSignatures();
    expect(Array.isArray(sigs)).toBe(true);
    doc.close();
  });

  it('throws on lite tier', async () => {
    setTier('lite');
    const doc = await PDFDocument.open(createMinimalPDF());
    await expect(doc.getSignatures()).rejects.toThrow(/full build/);
    doc.close();
  });
});

describe('SignatureInfo', () => {
  it('parses PDF date strings', () => {
    const date = SignatureInfo.parseDate('D:20240115103045+05\'30');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2024);
    expect(date!.getMonth()).toBe(0); // January
    expect(date!.getDate()).toBe(15);
  });

  it('returns null for empty date', () => {
    expect(SignatureInfo.parseDate('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(SignatureInfo.parseDate('not-a-date')).toBeNull();
  });

  it('formats signature summary', () => {
    const summary = SignatureInfo.formatSummary({
      index: 0,
      contents: new Uint8Array(0),
      byteRange: [],
      subFilter: 'adbe.pkcs7.detached',
      reason: 'Document approval',
      signingTime: 'D:20240115103045Z',
      docMDPPermission: 2,
    });

    expect(summary).toContain('Document approval');
    expect(summary).toContain('adbe.pkcs7.detached');
  });

  it('identifies signature formats', () => {
    expect(SignatureInfo.getSignatureFormat('adbe.pkcs7.detached')).toBe('PKCS#7 Detached');
    expect(SignatureInfo.getSignatureFormat('ETSI.CAdES.detached')).toBe('CAdES Detached (PAdES)');
    expect(SignatureInfo.getSignatureFormat('unknown')).toBe('unknown');
  });
});
