import { describe, it, expect, beforeEach } from 'vitest';
import { setTier } from '../src/capabilities';
import { WasmLoader } from '../src/core/WasmLoader';
import { PDFDocument } from '../src/document/PDFDocument';
import { createMinimalPDF } from './helpers';

describe('Forms (full tier)', () => {
  beforeEach(() => {
    WasmLoader.reset();
    setTier('full');
  });

  it('getFormFields returns array', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const fields = await doc.getFormFields();
    expect(Array.isArray(fields)).toBe(true);
    doc.close();
  });

  it('flattenForms does not throw', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    await expect(doc.flattenForms()).resolves.not.toThrow();
    doc.close();
  });

  it('throws on lite tier', async () => {
    setTier('lite');
    const doc = await PDFDocument.open(createMinimalPDF());
    await expect(doc.getFormFields()).rejects.toThrow(/full build/);
    doc.close();
  });
});
