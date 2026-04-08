---
sidebar_position: 7
title: Worker Pool
---

# Worker Pool

Render pages concurrently across Web Workers to keep the main thread responsive.

```typescript
import { WorkerPool } from "pdfnova/lite";
```

## Setup

```typescript
const pool = new WorkerPool(4);
await pool.init({ tier: "lite" });
```

## Render Multiple Pages

```typescript
const images = await pool.renderPages([0, 1, 2, 3], { scale: 2 });
```

## Cleanup

```typescript
pool.destroy();
```

## When to Use

- **Large documents** where rendering many pages sequentially would block the UI
- **Thumbnail generation** for all pages at once
- **Print preview** rendering all pages in parallel

For most use cases, the main-thread API is sufficient. The `VirtualRenderer` handles lazy rendering without workers.
