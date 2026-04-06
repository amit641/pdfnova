/**
 * Generates a minimal valid PDF as an ArrayBuffer.
 * This is a syntactically valid PDF 1.4 with one blank page.
 */
export function createMinimalPDF(): ArrayBuffer {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Root 1 0 R /Size 4 >>
startxref
190
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf).buffer as ArrayBuffer;
}

/**
 * Generates a multi-page PDF.
 */
export function createMultiPagePDF(pageCount: number): ArrayBuffer {
  let kids = '';
  let objects = '';
  let objNum = 3;
  const offsets: number[] = [];

  for (let i = 0; i < pageCount; i++) {
    kids += `${objNum} 0 R `;
    objects += `${objNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n`;
    objNum++;
  }

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [${kids.trim()}] /Count ${pageCount} >>
endobj
${objects}xref
0 ${objNum}
0000000000 65535 f 
${'0000000009 00000 n \n'.repeat(objNum - 1)}trailer
<< /Root 1 0 R /Size ${objNum} >>
startxref
0
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf).buffer as ArrayBuffer;
}

/**
 * Returns a non-PDF buffer for error testing.
 */
export function createInvalidBuffer(): ArrayBuffer {
  return new TextEncoder().encode('This is not a PDF file').buffer as ArrayBuffer;
}
