---
sidebar_position: 5
title: Digital Signatures
---

# Digital Signatures

Inspect digital signature data embedded in signed PDFs. Requires the full tier.

```typescript
import { PDFDocument } from "pdfnova";
```

## Read Signatures

```typescript
const doc = await PDFDocument.open(signedPdf);
const signatures = await doc.getSignatures();

for (const sig of signatures) {
  console.log(`Reason: ${sig.reason}`);
  console.log(`Time: ${sig.signingTime}`);
  console.log(`Filter: ${sig.subFilter}`);
}
```

## Format Signature Info

```typescript
import { SignatureInfo } from "pdfnova";

for (const sig of signatures) {
  console.log(SignatureInfo.formatSummary(sig));
  console.log(SignatureInfo.getSignatureFormat(sig.subFilter));
}
```

## Notes

- pdfnova reads signature data from PDFium but does **not** perform cryptographic validation. For full verification, extract the `contents` (PKCS#7 data) and `byteRange`, then validate using a crypto library.
