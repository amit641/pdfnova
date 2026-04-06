import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PDFDocument } from '../src/document/PDFDocument';
import { WasmLoader } from '../src/core/WasmLoader';
import { createMinimalPDF, createMultiPagePDF, createInvalidBuffer } from './helpers';

describe('PDFDocument', () => {
  beforeEach(() => {
    WasmLoader.reset();
  });

  describe('open', () => {
    it('opens a valid PDF from ArrayBuffer', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      expect(doc).toBeDefined();
      expect(doc.pageCount).toBeGreaterThanOrEqual(1);
      doc.close();
    });

    it('opens a valid PDF from Uint8Array', async () => {
      const pdf = createMinimalPDF();
      const doc = await PDFDocument.open(new Uint8Array(pdf));
      expect(doc.pageCount).toBeGreaterThanOrEqual(1);
      doc.close();
    });

    it('throws on invalid PDF data', async () => {
      await expect(PDFDocument.open(createInvalidBuffer())).rejects.toThrow();
    });

    it('opens multi-page PDFs', async () => {
      const doc = await PDFDocument.open(createMultiPagePDF(5));
      expect(doc.pageCount).toBe(5);
      doc.close();
    });
  });

  describe('metadata', () => {
    it('returns metadata object', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const meta = doc.metadata;

      expect(meta).toHaveProperty('title');
      expect(meta).toHaveProperty('author');
      expect(meta).toHaveProperty('subject');
      expect(meta).toHaveProperty('keywords');
      expect(meta).toHaveProperty('creator');
      expect(meta).toHaveProperty('producer');
      expect(meta).toHaveProperty('creationDate');
      expect(meta).toHaveProperty('modDate');

      doc.close();
    });
  });

  describe('permissions', () => {
    it('returns permissions object', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const perms = doc.permissions;

      expect(typeof perms.print).toBe('boolean');
      expect(typeof perms.copy).toBe('boolean');
      expect(typeof perms.modify).toBe('boolean');
      expect(typeof perms.annotate).toBe('boolean');

      doc.close();
    });
  });

  describe('outline', () => {
    it('returns an array (possibly empty)', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const outline = doc.outline;
      expect(Array.isArray(outline)).toBe(true);
      doc.close();
    });
  });

  describe('getPage', () => {
    it('returns a page object', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const page = doc.getPage(0);

      expect(page).toBeDefined();
      expect(page.pageIndex).toBe(0);
      expect(page.width).toBeGreaterThan(0);
      expect(page.height).toBeGreaterThan(0);

      doc.close();
    });

    it('throws on out-of-range index', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      expect(() => doc.getPage(-1)).toThrow(RangeError);
      expect(() => doc.getPage(999)).toThrow(RangeError);
      doc.close();
    });

    it('caches page instances', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const page1 = doc.getPage(0);
      const page2 = doc.getPage(0);
      expect(page1).toBe(page2);
      doc.close();
    });
  });

  describe('search', () => {
    it('returns results array', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      const results = doc.search('sample');
      expect(Array.isArray(results)).toBe(true);
      doc.close();
    });

    it('returns empty array for empty query', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      expect(doc.search('')).toEqual([]);
      doc.close();
    });
  });

  describe('close', () => {
    it('marks document as closed', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      expect(doc.isClosed).toBe(false);
      doc.close();
      expect(doc.isClosed).toBe(true);
    });

    it('throws on operations after close', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      doc.close();
      expect(() => doc.pageCount).toThrow('Document has been closed');
      expect(() => doc.getPage(0)).toThrow('Document has been closed');
    });

    it('is idempotent', async () => {
      const doc = await PDFDocument.open(createMinimalPDF());
      doc.close();
      expect(() => doc.close()).not.toThrow();
    });
  });
});
