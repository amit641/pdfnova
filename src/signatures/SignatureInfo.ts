import type { SignatureData } from '../types';

/**
 * Utility class for parsing and formatting signature metadata.
 */
export class SignatureInfo {
  /**
   * Parse a PDF date string (D:YYYYMMDDHHmmSSOHH'mm') into a Date object.
   */
  static parseDate(pdfDate: string): Date | null {
    if (!pdfDate) return null;

    const cleaned = pdfDate.replace(/^D:/, '');
    const match = cleaned.match(
      /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-Z])(\d{2})'?(\d{2})?/,
    );

    if (!match) return null;

    const [, year, month, day, hour, minute, second, tzSign, tzHour, tzMinute] = match;

    let isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    if (tzSign === 'Z') {
      isoStr += 'Z';
    } else {
      isoStr += `${tzSign}${tzHour}:${tzMinute ?? '00'}`;
    }

    const date = new Date(isoStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Human-readable summary of a signature.
   */
  static formatSummary(sig: SignatureData): string {
    const parts: string[] = [];

    if (sig.reason) parts.push(`Reason: ${sig.reason}`);
    if (sig.signingTime) {
      const date = SignatureInfo.parseDate(sig.signingTime);
      parts.push(`Signed: ${date ? date.toISOString() : sig.signingTime}`);
    }
    if (sig.subFilter) parts.push(`Type: ${sig.subFilter}`);

    const permDesc: Record<number, string> = {
      1: 'No changes allowed',
      2: 'Form filling and signing allowed',
      3: 'Form filling, signing, and annotation allowed',
    };
    if (sig.docMDPPermission > 0) {
      parts.push(`Permissions: ${permDesc[sig.docMDPPermission] ?? 'Unknown'}`);
    }

    return parts.join('\n');
  }

  /**
   * Determine the signature format from subFilter.
   */
  static getSignatureFormat(subFilter: string): string {
    const formats: Record<string, string> = {
      'adbe.pkcs7.detached': 'PKCS#7 Detached',
      'adbe.pkcs7.sha1': 'PKCS#7 SHA-1',
      'adbe.x509.rsa_sha1': 'X.509 RSA SHA-1',
      'ETSI.CAdES.detached': 'CAdES Detached (PAdES)',
      'ETSI.RFC3161': 'RFC 3161 Timestamp',
    };
    return formats[subFilter] ?? subFilter ?? 'Unknown';
  }
}
