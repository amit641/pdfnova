---
sidebar_position: 2
title: Getting Started
---

# Getting Started

## Installation

```bash
npm install pdfnova    # npm
pnpm add pdfnova       # pnpm
yarn add pdfnova       # yarn
bun add pdfnova        # bun
```

## Open a PDF

pdfnova accepts URLs, `ArrayBuffer`, `Uint8Array`, `File`, `Blob`, or base64 data URIs:

```typescript
import { PDFDocument } from "pdfnova/lite";

// From URL
const doc = await PDFDocument.open("/report.pdf");

// From ArrayBuffer
const buffer = await fetch("/report.pdf").then((r) => r.arrayBuffer());
const doc = await PDFDocument.open(buffer);

// From File input
const file = fileInput.files[0];
const doc = await PDFDocument.open(file);

// From base64
const doc = await PDFDocument.open("data:application/pdf;base64,JVBERi...");
```

## Render a Page

```typescript
const page = doc.getPage(0);
const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
await page.render(canvas, { scale: 2 });
```

## Extract Text

```typescript
const text = page.getText();
console.log(text);
```

## Search

```typescript
const results = doc.search("quarterly revenue");
for (const match of results) {
  console.log(`Page ${match.pageIndex + 1}: "${match.text}" at char ${match.charIndex}`);
}
```

## Document Info

```typescript
console.log(doc.pageCount);    // 42
console.log(doc.metadata);     // { title, author, subject, ... }
console.log(doc.outline);      // OutlineItem[] (bookmarks tree)
```

## Cleanup

Always close documents when done to free WASM memory:

```typescript
doc.close();
```

Or use `using` (TypeScript 5.2+):

```typescript
using doc = await PDFDocument.open("/report.pdf");
// doc.close() called automatically when scope exits
```

## Password-Protected PDFs

```typescript
const doc = await PDFDocument.open(encryptedPdf, {
  password: "secret123",
});
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

## Custom WASM URL

By default, pdfnova loads the PDFium WASM from jsDelivr CDN. To self-host:

```typescript
const doc = await PDFDocument.open(data, {
  wasmUrl: "https://cdn.example.com/pdfium.wasm",
});
```

Copy the binary from `node_modules/@embedpdf/pdfium/dist/pdfium.wasm` to your static assets.

## Next Steps

- [Rendering](/guides/rendering) — scales, rotation, thumbnails, fit-to-width
- [Text & Search](/guides/text-and-search) — text layers, character boxes, full-text search
- [Annotations](/guides/annotations) — read, create, and remove annotations
- [Forms](/guides/forms) — read fields, fill values, flatten
- [Digital Signatures](/guides/signatures) — inspect signature data
- [API Reference](/api-reference) — complete type documentation
