---
sidebar_position: 6
title: Virtual Renderer
---

# Virtual Renderer

For large documents, `VirtualRenderer` only renders pages visible in the viewport.

```typescript
import { VirtualRenderer } from "pdfnova/lite";
```

## Setup

```typescript
const renderer = new VirtualRenderer({
  container: document.getElementById("viewer")!,
  scale: 1.5,
  overscan: 2,
  cacheSize: 10,
  gap: 8,
});

await renderer.setDocument(doc);
```

## Navigation

```typescript
renderer.scrollToPage(5);
const currentPage = renderer.getCurrentPage();
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | required | Scrollable container element |
| `scale` | `number` | `1` | Render scale |
| `overscan` | `number` | `1` | Pages to render outside viewport |
| `cacheSize` | `number` | `5` | LRU cache size for rendered canvases |
| `gap` | `number` | `0` | Gap between pages in pixels |

This keeps memory usage constant regardless of document size.
