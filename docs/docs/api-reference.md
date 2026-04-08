---
sidebar_position: 10
title: API Reference
---

# API Reference

## `PDFDocument`

### `PDFDocument.open(source, options?)`

Open a PDF from any supported source.

```typescript
const doc = await PDFDocument.open("/report.pdf");
const doc = await PDFDocument.open(arrayBuffer);
const doc = await PDFDocument.open(file, { password: "secret" });
```

**Source:** `string | ArrayBuffer | Uint8Array | File | Blob`

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `password` | `string` | — | Password for encrypted PDFs |
| `headers` | `Record<string, string>` | — | HTTP headers for URL fetching |
| `credentials` | `RequestCredentials` | — | Fetch credentials mode |
| `wasmUrl` | `string` | jsDelivr CDN | Custom WASM binary URL |

### Properties

| Property | Type | Description |
|---|---|---|
| `.pageCount` | `number` | Total number of pages |
| `.metadata` | `PDFMetadata` | Document metadata |
| `.outline` | `OutlineItem[]` | Bookmark/TOC tree |
| `.permissions` | `PDFPermissions` | Document permissions |
| `.isClosed` | `boolean` | Whether closed |

### Methods

| Method | Returns | Description |
|---|---|---|
| `.getPage(index)` | `PDFPage` | Get a page (0-indexed) |
| `.search(query, options?)` | `SearchResult[]` | Full-text search |
| `.getFormFields()` | `Promise<FormFieldData[]>` | Read form fields (full) |
| `.setFormField(name, value)` | `Promise<void>` | Fill a field (full) |
| `.flattenForms(usage?)` | `Promise<void>` | Flatten forms (full) |
| `.getSignatures()` | `Promise<SignatureData[]>` | Read signatures (full) |
| `.save()` | `Promise<Uint8Array>` | Save modified PDF (full) |
| `.close()` | `void` | Free all WASM memory |

---

## `PDFPage`

### Properties

| Property | Type | Description |
|---|---|---|
| `.pageIndex` | `number` | 0-based page index |
| `.width` | `number` | Width in PDF points |
| `.height` | `number` | Height in PDF points |

### Methods

| Method | Returns | Description |
|---|---|---|
| `.render(canvas, options?)` | `Promise<void>` | Render to canvas |
| `.renderToImageData(options?)` | `Promise<ImageData>` | Render to ImageData |
| `.getText()` | `string` | Extract plain text |
| `.getTextSpans()` | `TextSpan[]` | Text with positions |
| `.getCharBoxes()` | `CharBox[]` | Character bounding boxes |
| `.createTextLayer(container)` | `HTMLElement` | Build text overlay |
| `.search(query, options?)` | `SearchResult[]` | Search this page |
| `.getLinks()` | `LinkInfo[]` | Extract hyperlinks |
| `.getAnnotations()` | `Promise<AnnotationData[]>` | Read annotations (full) |
| `.addAnnotation(options)` | `Promise<void>` | Add annotation (full) |
| `.removeAnnotation(index)` | `Promise<void>` | Remove annotation (full) |
| `.close()` | `void` | Free page resources |

---

## `WasmLoader`

| Method | Returns | Description |
|---|---|---|
| `WasmLoader.load(options?)` | `Promise<WasmModule>` | Load WASM module |
| `WasmLoader.isLoaded()` | `boolean` | Check if loaded |
| `WasmLoader.reset()` | `void` | Destroy and reset |
| `WasmLoader.clearCache()` | `Promise<void>` | Clear IndexedDB cache |

---

## Types

### `RenderOptions`

```typescript
interface RenderOptions {
  scale?: number;
  rotation?: 0 | 90 | 180 | 270;
  background?: string;
  flags?: number;
}
```

### `PDFMetadata`

```typescript
interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
}
```

### `SearchResult`

```typescript
interface SearchResult {
  pageIndex: number;
  matchIndex: number;
  charIndex: number;
  charCount: number;
  rects: TextRect[];
  text: string;
}
```

### `TextSpan`

```typescript
interface TextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  charIndex: number;
  charCount: number;
}
```

### `CharBox`

```typescript
interface CharBox {
  char: string;
  charCode: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  fontSize: number;
  index: number;
}
```

### `AnnotationData`

```typescript
interface AnnotationData {
  index: number;
  type: AnnotationType;
  rect: AnnotationRect;
  color?: AnnotationColor;
  contents?: string;
  author?: string;
  modificationDate?: string;
  attachmentPoints?: AttachmentPoint[];
}
```

### `FormFieldData`

```typescript
interface FormFieldData {
  name: string;
  type: FormFieldType;
  value: string;
  flags: number;
  isChecked?: boolean;
  pageIndex: number;
  annotIndex: number;
}
```

### `SignatureData`

```typescript
interface SignatureData {
  index: number;
  contents: Uint8Array;
  byteRange: number[];
  subFilter: string;
  reason: string;
  signingTime: string;
  docMDPPermission: number;
}
```

### Enums

```typescript
enum AnnotationType {
  Text = 1, Link = 2, FreeText = 3, Line = 4, Square = 5,
  Circle = 6, Highlight = 9, Underline = 10, Squiggly = 11,
  StrikeOut = 12, Stamp = 13, Ink = 15, Widget = 20, Redact = 28,
}

enum FormFieldType {
  Unknown = -1, PushButton = 0, CheckBox = 1, RadioButton = 2,
  ComboBox = 3, ListBox = 4, TextField = 5, Signature = 6,
}
```
