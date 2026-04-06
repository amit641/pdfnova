import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from '../src/document/PDFDocument';
import { WasmLoader } from '../src/core/WasmLoader';
import { createMinimalPDF } from './helpers';

describe('PDFPage', () => {
  beforeEach(() => {
    WasmLoader.reset();
  });

  it('has correct dimensions', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    expect(page.width).toBe(612);  // Letter width in points
    expect(page.height).toBe(792); // Letter height in points

    doc.close();
  });

  it('extracts text', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);
    const text = page.getText();

    expect(typeof text).toBe('string');
    doc.close();
  });

  it('extracts text spans with positions', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);
    const spans = page.getTextSpans();

    expect(Array.isArray(spans)).toBe(true);
    for (const span of spans) {
      expect(span).toHaveProperty('text');
      expect(span).toHaveProperty('x');
      expect(span).toHaveProperty('y');
      expect(span).toHaveProperty('width');
      expect(span).toHaveProperty('height');
      expect(span).toHaveProperty('fontSize');
    }

    doc.close();
  });

  it('extracts character boxes', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);
    const boxes = page.getCharBoxes();

    expect(Array.isArray(boxes)).toBe(true);
    for (const box of boxes) {
      expect(box).toHaveProperty('char');
      expect(box).toHaveProperty('left');
      expect(box).toHaveProperty('right');
      expect(box).toHaveProperty('top');
      expect(box).toHaveProperty('bottom');
      expect(box).toHaveProperty('fontSize');
      expect(box).toHaveProperty('index');
    }

    doc.close();
  });

  it('searches within page', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);
    const results = page.search('Sample');

    expect(Array.isArray(results)).toBe(true);
    doc.close();
  });

  it('returns links array', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);
    const links = page.getLinks();

    expect(Array.isArray(links)).toBe(true);
    doc.close();
  });

  it('closes properly', async () => {
    const doc = await PDFDocument.open(createMinimalPDF());
    const page = doc.getPage(0);

    page.close();
    expect(() => page.getText()).toThrow('Page has been closed');
  });
});
