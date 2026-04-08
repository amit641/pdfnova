---
slug: /
sidebar_position: 1
title: Introduction
---

# pdfnova

**PDFium-powered PDF library for JavaScript & TypeScript.**

Chrome-grade rendering via WebAssembly. Full TypeScript types. Zero-config WASM loading.

```bash
npm install pdfnova
```

```typescript
import { PDFDocument } from "pdfnova/lite";

const doc = await PDFDocument.open("/report.pdf");
const page = doc.getPage(0);
await page.render(canvas, { scale: 2 });
doc.close();
```

That's it. No worker setup. No manual WASM configuration. The PDFium engine loads automatically.

## Why pdfnova?

| | pdfnova | pdf.js | Raw PDFium |
|---|---|---|---|
| **Rendering engine** | PDFium (Chrome's engine) | Custom JS renderer | PDFium |
| **JS bundle** | ~3-5 KB | ~400 KB | N/A |
| **WASM binary** | 4.4 MB (cached in IndexedDB) | — | Must compile yourself |
| **TypeScript** | First-class, fully typed | Community types | No types |
| **Text selection** | Character-level precision | Approximate | Manual |
| **Search** | Native PDFium search | JS-based | Manual C API |
| **Annotations** | Read/write | Read only | Manual C API |
| **Forms** | Fill, flatten, read | Read only | Manual C API |
| **Signatures** | Read & inspect | — | Manual C API |
| **WASM setup** | Automatic (CDN + IndexedDB cache) | — | Manual Emscripten |

## Two Tiers

pdfnova ships two entry points — use what you need:

| | pdfnova/lite | pdfnova (full) |
|---|---|---|
| **JS Bundle** | ~3 KB | ~5 KB |
| Rendering | Yes | Yes |
| Text extraction | Yes | Yes |
| Text layer (DOM) | Yes | Yes |
| Search | Yes | Yes |
| Bookmarks/TOC | Yes | Yes |
| Virtual renderer | Yes | Yes |
| Worker pool | Yes | Yes |
| Annotations | — | Yes |
| Form filling | — | Yes |
| Digital signatures | — | Yes |
| Save modified PDF | — | Yes |

Both tiers share the same WASM binary (4.4 MB on disk, ~1.5 MB over the wire with Brotli). The binary is cached in IndexedDB after the first load — subsequent visits are instant.

```typescript
// Lightweight — render, text, search, bookmarks
import { PDFDocument } from "pdfnova/lite";

// Full — everything above + annotations, forms, signatures
import { PDFDocument } from "pdfnova";
```

## Architecture

```
┌──────────────────────────────────────────────┐
│           PDFDocument / PDFPage               │  ← Public API
├──────────────────────────────────────────────┤
│  TextExtractor │ SearchEngine │ PageRenderer  │  ← Feature modules
├──────────────────────────────────────────────┤
│           WasmBridge + MemoryManager          │  ← Pointer management
├──────────────────────────────────────────────┤
│              WasmLoader (IndexedDB cache)      │  ← WASM lifecycle
├──────────────────────────────────────────────┤
│         PDFium (4.4 MB WebAssembly)           │  ← Chrome's PDF engine
└──────────────────────────────────────────────┘
```

## Browser Support

| Browser | Supported |
|---|---|
| Chrome 69+ | Yes |
| Firefox 62+ | Yes |
| Safari 15+ | Yes |
| Edge 79+ | Yes |
| Node.js 18+ | Yes (mock mode for testing) |
