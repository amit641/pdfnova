---
sidebar_position: 8
title: WASM Loading
---

# WASM Loading & Caching

pdfnova uses Google's PDFium engine compiled to WebAssembly via [`@embedpdf/pdfium`](https://www.npmjs.com/package/@embedpdf/pdfium).

## How It Works

1. On first `PDFDocument.open()`, the WASM binary (4.4 MB) is fetched from jsDelivr CDN
2. With Brotli compression (standard on CDNs), the actual transfer is **~1.5 MB**
3. The binary is **cached in IndexedDB** — subsequent visits load instantly
4. The module is initialized and adapted to pdfnova's typed interface

## Size Breakdown

| Component | Size |
|---|---|
| pdfnova JS (lite) | ~3 KB minified |
| pdfnova JS (full) | ~5 KB minified |
| PDFium WASM (on disk) | 4.4 MB |
| PDFium WASM (Brotli transfer) | ~1.5 MB |
| PDFium WASM (after IndexedDB cache) | 0 bytes (cached) |

## Custom WASM URL

```typescript
const doc = await PDFDocument.open(data, {
  wasmUrl: "https://cdn.example.com/pdfium.wasm",
});
```

```bash
cp node_modules/@embedpdf/pdfium/dist/pdfium.wasm public/
```

## Clear Cache

```typescript
import { WasmLoader } from "pdfnova/lite";
await WasmLoader.clearCache();
```

## Preloading

```typescript
import { WasmLoader } from "pdfnova/lite";

// Start loading immediately (non-blocking)
WasmLoader.load();

// Later, when the user opens a PDF, it's already loaded
const doc = await PDFDocument.open(file);
```

## Server Configuration

| Header | Value |
|---|---|
| `Content-Type` | `application/wasm` |
| `Content-Encoding` | `br` (Brotli) or `gzip` |
| `Cache-Control` | `public, max-age=31536000, immutable` |

Most CDNs handle this automatically.
