import type { RenderOptions } from '../types';
import { PDFPage } from './PDFPage';

/**
 * Standalone rendering utility that can render a page to various targets.
 * Useful for server-side rendering or generating thumbnails.
 */
export class PageRenderer {
  /**
   * Render a page to an HTMLCanvasElement or OffscreenCanvas.
   */
  static async renderToCanvas(
    page: PDFPage,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options?: RenderOptions,
  ): Promise<void> {
    return page.render(canvas, options);
  }

  /**
   * Render a page to raw ImageData (no DOM required).
   */
  static async renderToImageData(
    page: PDFPage,
    options?: RenderOptions,
  ): Promise<ImageData> {
    return page.renderToImageData(options);
  }

  /**
   * Generate a thumbnail at a specific maximum dimension.
   */
  static async renderThumbnail(
    page: PDFPage,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    maxDimension: number = 200,
  ): Promise<void> {
    const aspect = page.width / page.height;
    let scale: number;
    if (aspect >= 1) {
      scale = maxDimension / page.width;
    } else {
      scale = maxDimension / page.height;
    }
    return page.render(canvas, { scale });
  }

  /**
   * Calculate the scale needed to fit a page within given dimensions.
   */
  static fitScale(page: PDFPage, containerWidth: number, containerHeight: number): number {
    const scaleX = containerWidth / page.width;
    const scaleY = containerHeight / page.height;
    return Math.min(scaleX, scaleY);
  }

  /**
   * Calculate the scale needed to fit page width within container width.
   */
  static fitWidthScale(page: PDFPage, containerWidth: number): number {
    return containerWidth / page.width;
  }
}
