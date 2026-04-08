---
sidebar_position: 3
title: Annotations
---

# Annotations

Read, create, and remove PDF annotations. Requires the full tier.

```typescript
import { PDFDocument, AnnotationType } from "pdfnova";
```

## Read Annotations

```typescript
const page = doc.getPage(0);
const annotations = await page.getAnnotations();

for (const annot of annotations) {
  console.log(`Type: ${AnnotationType[annot.type]}`);
  console.log(`Rect: ${JSON.stringify(annot.rect)}`);
  console.log(`Contents: ${annot.contents}`);
}
```

## Add Annotations

### Highlight

```typescript
await page.addAnnotation({
  type: AnnotationType.Highlight,
  rect: { left: 72, top: 720, right: 300, bottom: 700 },
  color: { r: 255, g: 235, b: 59, a: 128 },
  contents: "Important section",
});
```

### Text Note

```typescript
await page.addAnnotation({
  type: AnnotationType.Text,
  rect: { left: 500, top: 750, right: 520, bottom: 730 },
  contents: "Review this paragraph",
});
```

## Remove Annotations

```typescript
await page.removeAnnotation(0);
```

## Save After Modification

```typescript
await page.addAnnotation({ /* ... */ });
const bytes = await doc.save();
const blob = new Blob([bytes], { type: "application/pdf" });
```
