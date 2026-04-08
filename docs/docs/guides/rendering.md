---
sidebar_position: 1
title: Rendering
---

# Rendering

pdfnova uses PDFium's native rendering engine — the same one that powers Chrome's built-in PDF viewer.

## Render to Canvas

```typescript
const page = doc.getPage(0);
const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;

await page.render(canvas, {
  scale: 2,           // 2x resolution (for Retina displays)
  rotation: 0,        // 0, 90, 180, or 270 degrees
  background: "#ffffff",
});
```

The canvas dimensions are set automatically based on the page size and scale.

## Render to ImageData

For off-screen rendering or when you don't have a DOM:

```typescript
const imageData = await page.renderToImageData({ scale: 1.5 });
// imageData is a standard ImageData object
```

## Thumbnails

```typescript
import { PageRenderer } from "pdfnova/lite";

const thumbCanvas = document.createElement("canvas");
await PageRenderer.renderThumbnail(page, thumbCanvas, 200); // 200px wide
```

## Fit-to-Width

Calculate the scale needed to fit a page within a container:

```typescript
import { PageRenderer } from "pdfnova/lite";

const scale = PageRenderer.fitWidthScale(page, containerWidth);
await page.render(canvas, { scale });
```

## Render Flags

Fine-tune rendering with flags:

```typescript
import { RENDER_FLAG } from "pdfnova/lite";

await page.render(canvas, {
  flags: RENDER_FLAG.ANNOT | RENDER_FLAG.LCD_TEXT,
});
```

| Flag | Value | Description |
|---|---|---|
| `ANNOT` | `0x01` | Render annotations |
| `LCD_TEXT` | `0x02` | LCD-optimized text rendering |
| `NO_NATIVETEXT` | `0x04` | Don't use native text output |
| `GRAYSCALE` | `0x08` | Render in grayscale |
| `REVERSE_BYTE_ORDER` | `0x10` | RGBA byte order (used internally) |
| `PRINTING` | `0x800` | Render as if printing |

By default, `ANNOT | LCD_TEXT` is used. The `REVERSE_BYTE_ORDER` flag is always added internally for correct browser rendering.

## Page Dimensions

Page dimensions are in PDF points (1 point = 1/72 inch):

```typescript
const page = doc.getPage(0);
console.log(page.width);    // e.g. 612 (Letter width)
console.log(page.height);   // e.g. 792 (Letter height)

// Convert to pixels at a given DPI
const dpi = 150;
const pxWidth = page.width * (dpi / 72);
const pxHeight = page.height * (dpi / 72);
```

## Rotation

```typescript
await page.render(canvas, { rotation: 90, scale: 1.5 });
// Supported values: 0, 90, 180, 270
```

Canvas dimensions are automatically swapped for 90° and 270° rotations.
