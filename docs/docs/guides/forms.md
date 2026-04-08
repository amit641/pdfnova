---
sidebar_position: 4
title: Forms
---

# Form Filling

Read, fill, and flatten PDF forms. Requires the full tier.

```typescript
import { PDFDocument } from "pdfnova";
```

## Read Form Fields

```typescript
const doc = await PDFDocument.open(formPdf);
const fields = await doc.getFormFields();

for (const field of fields) {
  console.log(`${field.name}: ${field.value} (${field.type})`);
}
```

## Fill Form Fields

```typescript
await doc.setFormField("name", "John Doe");
await doc.setFormField("email", "john@example.com");
```

## Flatten Forms

Flattening bakes form field values into the page content, making them non-interactive:

```typescript
await doc.flattenForms();
```

## Complete Example

```typescript
import { PDFDocument } from "pdfnova";

const doc = await PDFDocument.open(formPdf);
const fields = await doc.getFormFields();
console.log("Fields:", fields.map((f) => f.name));

await doc.setFormField("first_name", "Jane");
await doc.setFormField("last_name", "Smith");
await doc.flattenForms();

const bytes = await doc.save();
doc.close();
```
