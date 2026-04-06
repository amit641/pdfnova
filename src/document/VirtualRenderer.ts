import type { VirtualRendererOptions } from '../types';
import { PDFDocument } from './PDFDocument';

interface PageSlot {
  element: HTMLElement;
  canvas: HTMLCanvasElement | null;
  rendered: boolean;
  pageIndex: number;
}

/**
 * Viewport-aware lazy page renderer using IntersectionObserver.
 * Only renders pages visible in (or near) the viewport; uses an LRU cache
 * to bound memory usage for large documents.
 */
export class VirtualRenderer {
  private doc: PDFDocument | null = null;
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private slots: PageSlot[] = [];
  private observer: IntersectionObserver | null = null;
  private lru: number[] = [];
  private scale: number;
  private overscan: number;
  private cacheSize: number;
  private gap: number;
  private _destroyed = false;

  constructor(options: VirtualRendererOptions) {
    this.container = options.container;
    this.scale = options.scale ?? 1.0;
    this.overscan = options.overscan ?? 2;
    this.cacheSize = options.cacheSize ?? 10;
    this.gap = options.gap ?? 8;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pdfnova-virtual-wrapper';
    this.wrapper.style.cssText = 'position: relative; width: 100%;';
    this.container.appendChild(this.wrapper);
  }

  async setDocument(doc: PDFDocument): Promise<void> {
    this._cleanup();
    this.doc = doc;
    await this._buildSlots();
    this._setupObserver();
  }

  setScale(scale: number): void {
    this.scale = scale;
    if (this.doc) {
      this._rebuildAllSlots();
    }
  }

  getScale(): number {
    return this.scale;
  }

  scrollToPage(pageIndex: number, behavior: ScrollBehavior = 'smooth'): void {
    const slot = this.slots[pageIndex];
    if (slot) {
      slot.element.scrollIntoView({ behavior, block: 'start' });
    }
  }

  /**
   * Returns the index of the page most visible in the viewport.
   */
  getCurrentPage(): number {
    const containerRect = this.container.getBoundingClientRect();
    const containerMid = containerRect.top + containerRect.height / 2;
    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < this.slots.length; i++) {
      const rect = this.slots[i].element.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - containerMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._cleanup();
    this.wrapper.remove();
  }

  // ─── Private ──────────────────────────────────────────────────

  private async _buildSlots(): Promise<void> {
    if (!this.doc) return;

    this.wrapper.innerHTML = '';
    this.slots = [];

    for (let i = 0; i < this.doc.pageCount; i++) {
      const page = this.doc.getPage(i);
      const w = page.width * this.scale;
      const h = page.height * this.scale;

      const el = document.createElement('div');
      el.className = 'pdfnova-page-slot';
      el.dataset.pageIndex = String(i);
      el.style.cssText = `
        width: ${w}px;
        height: ${h}px;
        margin: 0 auto ${this.gap}px auto;
        position: relative;
        background: #f0f0f0;
        overflow: hidden;
      `;

      // Page number placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'pdfnova-page-placeholder';
      placeholder.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: #999;
        font-size: 14px;
      `;
      placeholder.textContent = `Page ${i + 1}`;
      el.appendChild(placeholder);

      this.wrapper.appendChild(el);
      this.slots.push({ element: el, canvas: null, rendered: false, pageIndex: i });
    }
  }

  private _setupObserver(): void {
    if (this.observer) this.observer.disconnect();

    const margin = `${this.overscan * 100}% 0px`;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const pageIndex = parseInt(el.dataset.pageIndex ?? '-1', 10);
          if (pageIndex < 0) continue;

          if (entry.isIntersecting) {
            this._renderSlot(pageIndex);
          }
        }
      },
      { root: this.container, rootMargin: margin, threshold: 0 },
    );

    for (const slot of this.slots) {
      this.observer.observe(slot.element);
    }
  }

  private async _renderSlot(pageIndex: number): Promise<void> {
    const slot = this.slots[pageIndex];
    if (!slot || slot.rendered || !this.doc) return;

    slot.rendered = true;
    this._touchLRU(pageIndex);

    const page = this.doc.getPage(pageIndex);
    const canvas = document.createElement('canvas');
    canvas.className = 'pdfnova-page-canvas';
    canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';

    await page.render(canvas, { scale: this.scale });

    // Remove placeholder, add canvas
    slot.element.innerHTML = '';
    slot.element.appendChild(canvas);
    slot.canvas = canvas;

    this._evictLRU();
  }

  private _touchLRU(pageIndex: number): void {
    const idx = this.lru.indexOf(pageIndex);
    if (idx >= 0) this.lru.splice(idx, 1);
    this.lru.push(pageIndex);
  }

  private _evictLRU(): void {
    while (this.lru.length > this.cacheSize) {
      const evictIndex = this.lru.shift()!;
      const slot = this.slots[evictIndex];
      if (slot && slot.rendered) {
        slot.rendered = false;
        slot.canvas = null;
        slot.element.innerHTML = '';

        const placeholder = document.createElement('div');
        placeholder.className = 'pdfnova-page-placeholder';
        placeholder.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #999;
          font-size: 14px;
        `;
        placeholder.textContent = `Page ${evictIndex + 1}`;
        slot.element.appendChild(placeholder);
      }
    }
  }

  private async _rebuildAllSlots(): Promise<void> {
    this.lru = [];
    await this._buildSlots();
    this._setupObserver();
  }

  private _cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.slots = [];
    this.lru = [];
    this.wrapper.innerHTML = '';
  }
}
