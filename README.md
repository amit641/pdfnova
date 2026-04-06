# pdfnova

**PDFium-powered PDF library for JavaScript.** Chrome-grade rendering via WebAssembly with full TypeScript types. Supports text extraction, search, bookmarks, annotations, forms, and digital signatures.

## Installation

```bash
npm install pdfnova
```

## Two Tiers

|                          | pdfnova/lite | pdfnova (full) |
| ------------------------ | ------------ | -------------- |
| **Size (Brotli)**        | ~710KB       | ~1.3MB         |
| Rendering                | Yes          | Yes            |
| Text extraction          | Yes          | Yes            |
| Text layer (DOM)         | Yes          | Yes            |
| Search                   | Yes          | Yes            |
| Bookmarks/TOC            | Yes          | Yes            |
| Virtualization           | Yes          | Yes            |
| Worker/OffscreenCanvas   | Yes          | Yes            |
| Annotations (read/write) | —            | Yes            |
| Form filling/flattening  | —            | Yes            |
| Digital signatures       | —            | Yes            |
| doc.save()               | —            | Yes            |

```typescript
// Lightweight — render, text, search, bookmarks
import { PDFDocument } from "pdfnova/lite";

// Full — everything above + annotations, forms, signatures
import { PDFDocument } from "pdfnova";
```

## Quick Start

```typescript
import { PDFDocument } from "pdfnova/lite";

// Open from URL, ArrayBuffer, File, Blob, or base64 data URI
const doc = await PDFDocument.open("/report.pdf");

// Document info
console.log(doc.pageCount); // 42
console.log(doc.metadata); // { title, author, subject, ... }
console.log(doc.outline); // OutlineItem[] (bookmarks tree)

// Render a page
const page = doc.getPage(0);
const canvas = document.createElement("canvas");
await page.render(canvas, { scale: 2 });

// Text extraction with character-level precision
const text = page.getText();
const spans = page.getTextSpans(); // TextSpan[] with x, y, width, height

// Build a selectable text layer over the canvas
page.createTextLayer(container);

// Full-text search
const results = doc.search("quarterly revenue");

// Cleanup
doc.close();
```

## Rendering

```typescript
const page = doc.getPage(0);

// Render to canvas
await page.render(canvas, {
  scale: 2, // 2x resolution
  rotation: 90, // 0, 90, 180, 270
  background: "#ffffff",
});

// Render to ImageData (no DOM required)
const imageData = await page.renderToImageData({ scale: 1.5 });

// Thumbnails
import { PageRenderer } from "pdfnova/lite";
await PageRenderer.renderThumbnail(page, thumbCanvas, 200);

// Fit-to-width scale calculation
const scale = PageRenderer.fitWidthScale(page, containerWidth);
```

## Virtual Renderer

For large documents, only render visible pages:

```typescript
import { VirtualRenderer } from "pdfnova/lite";

const renderer = new VirtualRenderer({
  container: document.getElementById("viewer")!,
  scale: 1.5,
  overscan: 2, // render 2 pages above/below viewport
  cacheSize: 10, // LRU cache for rendered pages
});

await renderer.setDocument(doc);
renderer.scrollToPage(5);
console.log(renderer.getCurrentPage());
```

## Text Layer

pdfnova uses PDFium's character-level bounding boxes for pixel-perfect text selection:

```typescript
// Span-level positioning (fast, good enough for most use cases)
const layer = page.createTextLayer(container);

// Character-level positioning (slower but pixel-perfect)
import { TextLayerBuilder } from "pdfnova/lite";
const builder = new TextLayerBuilder(wasm, bridge);
builder.buildCharLevel(textPagePtr, container, page.width, page.height, scale);
```

## Search

```typescript
// Search a single page
const pageResults = page.search("revenue", { caseSensitive: true });

// Search entire document
const allResults = doc.search("quarterly revenue", { wholeWord: true });

// Each result has:
// - pageIndex, charIndex, charCount
// - rects (TextRect[] for highlighting)
// - text (matched text)
```

## Bookmarks / Table of Contents

```typescript
const outline = doc.outline;
// OutlineItem { title, pageIndex, children: OutlineItem[] }

for (const item of outline) {
  console.log(`${item.title} → page ${item.pageIndex + 1}`);
  for (const child of item.children) {
    console.log(`  ${child.title} → page ${child.pageIndex + 1}`);
  }
}
```

## Annotations (full tier)

```typescript
import { PDFDocument, AnnotationType } from "pdfnova";

const doc = await PDFDocument.open(data);
const page = doc.getPage(0);

// Read existing annotations
const annotations = await page.getAnnotations();

// Add a highlight annotation
await page.addAnnotation({
  type: AnnotationType.Highlight,
  rect: { left: 72, top: 720, right: 300, bottom: 700 },
  color: { r: 255, g: 235, b: 59, a: 128 },
  contents: "Important section",
});

// Remove an annotation
await page.removeAnnotation(0);

// Save modified PDF
const bytes = await doc.save();
```

## Form Filling (full tier)

```typescript
import { PDFDocument } from "pdfnova";

const doc = await PDFDocument.open(formPdf);

// Read all form fields
const fields = await doc.getFormFields();
// FormFieldData { name, type, value, isChecked, pageIndex }

// Fill fields
await doc.setFormField("name", "John Doe");
await doc.setFormField("email", "john@example.com");

// Flatten forms (make non-interactive)
await doc.flattenForms();

// Save
const filled = await doc.save();
```

## Digital Signatures (full tier)

```typescript
import { PDFDocument } from "pdfnova";

const doc = await PDFDocument.open(signedPdf);

const signatures = await doc.getSignatures();
// SignatureData { index, contents, byteRange, subFilter, reason, signingTime }

// Format signature info
import { SignatureInfo } from "pdfnova";
for (const sig of signatures) {
  console.log(SignatureInfo.formatSummary(sig));
  console.log(SignatureInfo.getSignatureFormat(sig.subFilter));
}
```

## Worker Pool

Render pages concurrently across multiple Web Workers:

```typescript
import { WorkerPool } from "pdfnova/lite";

const pool = new WorkerPool(4); // 4 workers
await pool.init({ tier: "lite" });

// Render multiple pages in parallel
const images = await pool.renderPages([0, 1, 2, 3], { scale: 2 });

pool.destroy();
```

## Authenticated URLs

```typescript
const doc = await PDFDocument.open(
  "https://api.example.com/documents/123/download",
  {
    headers: { Authorization: "Bearer eyJ..." },
    credentials: "include",
  },
);
```

## Password-Protected PDFs

```typescript
const doc = await PDFDocument.open(encryptedPdf, {
  password: "secret123",
});
```

## Custom WASM URL

Host the WASM binary on your own CDN:

```typescript
import { WasmLoader } from "pdfnova/lite";

const doc = await PDFDocument.open(data, {
  wasmUrl: "https://cdn.example.com/pdfium-lite.wasm",
});
```

## API Reference

### PDFDocument

| Method/Property                      | Description                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `PDFDocument.open(source, options?)` | Open a PDF from URL, ArrayBuffer, File, Blob, or data URI                        |
| `.pageCount`                         | Number of pages                                                                  |
| `.metadata`                          | `{ title, author, subject, keywords, creator, producer, creationDate, modDate }` |
| `.outline`                           | Bookmark tree (`OutlineItem[]`)                                                  |
| `.permissions`                       | `{ print, copy, modify, annotate, fillForms, ... }`                              |
| `.getPage(index)`                    | Get a page (0-indexed)                                                           |
| `.search(query, options?)`           | Search entire document                                                           |
| `.getFormFields()`                   | Read form fields (full tier)                                                     |
| `.setFormField(name, value)`         | Fill a form field (full tier)                                                    |
| `.flattenForms()`                    | Flatten forms (full tier)                                                        |
| `.getSignatures()`                   | Read digital signatures (full tier)                                              |
| `.save()`                            | Save modified PDF as Uint8Array (full tier)                                      |
| `.close()`                           | Free all WASM memory                                                             |

### PDFPage

| Method/Property                | Description                    |
| ------------------------------ | ------------------------------ |
| `.pageIndex`                   | 0-based page index             |
| `.width` / `.height`           | Page dimensions in PDF points  |
| `.render(canvas, options?)`    | Render to canvas               |
| `.renderToImageData(options?)` | Render to ImageData            |
| `.getText()`                   | Extract plain text             |
| `.getTextSpans()`              | Extract text with positions    |
| `.getCharBoxes()`              | Character-level bounding boxes |
| `.createTextLayer(container)`  | Build selectable text layer    |
| `.search(query, options?)`     | Search this page               |
| `.getLinks()`                  | Extract hyperlinks             |
| `.getAnnotations()`            | Read annotations (full tier)   |
| `.addAnnotation(options)`      | Add annotation (full tier)     |
| `.removeAnnotation(index)`     | Remove annotation (full tier)  |
| `.close()`                     | Free page resources            |

## Building the WASM Binary

```bash
# Prerequisites: Emscripten SDK, depot_tools
bash wasm/build.sh          # Build both lite and full
bash wasm/build.sh lite     # Build lite only
bash wasm/build.sh full     # Build full only
```

## License

MIT
