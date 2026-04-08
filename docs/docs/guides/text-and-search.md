---
sidebar_position: 2
title: Text & Search
---

# Text & Search

pdfnova uses PDFium's text extraction for character-level precision — the same accuracy as Chrome's "Find in PDF" feature.

## Extract Plain Text

```typescript
const page = doc.getPage(0);
const text = page.getText();
console.log(text);
```

## Text Spans

Get text with position data for each word/run:

```typescript
const spans = page.getTextSpans();
for (const span of spans) {
  console.log(span.text, span.x, span.y, span.fontSize);
}
```

Each `TextSpan` contains: `text`, `x`, `y`, `width`, `height`, `fontSize`, `charIndex`, `charCount`.

## Character Boxes

For pixel-perfect text selection or highlighting:

```typescript
const boxes = page.getCharBoxes();
for (const box of boxes) {
  console.log(`"${box.char}" at (${box.left}, ${box.bottom}) - (${box.right}, ${box.top})`);
}
```

## Text Layer

Build a transparent, selectable text overlay on top of a rendered canvas:

```typescript
const container = document.getElementById("page-container")!;
const canvas = document.createElement("canvas");
await page.render(canvas, { scale: 2 });
container.appendChild(canvas);

const textLayer = page.createTextLayer(container);
```

The text layer enables native text selection, copy/paste, and accessibility.

## Full-Text Search

### Search a Single Page

```typescript
const results = page.search("revenue", { caseSensitive: true });
for (const match of results) {
  console.log(`Found "${match.text}" at char index ${match.charIndex}`);
}
```

### Search the Entire Document

```typescript
const allResults = doc.search("quarterly revenue", { wholeWord: true });
for (const match of allResults) {
  console.log(`Page ${match.pageIndex + 1}: "${match.text}"`);
}
```

### Search Options

| Option | Type | Default | Description |
|---|---|---|---|
| `caseSensitive` | `boolean` | `false` | Match case exactly |
| `wholeWord` | `boolean` | `false` | Match whole words only |

### Highlighting Search Results

```typescript
const results = doc.search("revenue");
const ctx = canvas.getContext("2d")!;
const scale = 2;

ctx.fillStyle = "rgba(255, 235, 59, 0.4)";
for (const match of results.filter((r) => r.pageIndex === 0)) {
  for (const rect of match.rects) {
    ctx.fillRect(
      rect.left * scale,
      (page.height - rect.top) * scale,
      (rect.right - rect.left) * scale,
      (rect.top - rect.bottom) * scale,
    );
  }
}
```

## Bookmarks / Table of Contents

```typescript
const outline = doc.outline;
for (const item of outline) {
  console.log(`${item.title} → page ${item.pageIndex + 1}`);
  for (const child of item.children) {
    console.log(`  ${child.title} → page ${child.pageIndex + 1}`);
  }
}
```

## Links

```typescript
const links = page.getLinks();
for (const link of links) {
  console.log(`${link.url} at page ${link.pageIndex}`);
}
```
