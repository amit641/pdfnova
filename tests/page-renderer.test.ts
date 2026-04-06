import { describe, it, expect } from 'vitest';
import { PageRenderer } from '../src/document/PageRenderer';
import { PDFDocument } from '../src/document/PDFDocument';
import { WasmLoader } from '../src/core/WasmLoader';
import { createMinimalPDF } from './helpers';

describe('PageRenderer', () => {
  it('fitScale calculates correct scale', async () => {
    WasmLoader.reset();
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    const scale = PageRenderer.fitScale(page, 800, 600);
    expect(scale).toBeCloseTo(Math.min(800 / 612, 600 / 792), 2);

    doc.close();
  });

  it('fitWidthScale calculates width-based scale', async () => {
    WasmLoader.reset();
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    const scale = PageRenderer.fitWidthScale(page, 800);
    expect(scale).toBeCloseTo(800 / 612, 2);

    doc.close();
  });
});
