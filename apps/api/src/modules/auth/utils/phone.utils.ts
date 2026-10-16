/**
 * Normalizes phone numbers (especially Bangladeshi phone numbers) into standard E.164 (+8801XXXXXXXXX).
 * Supports:
 * - 017XXXXXXXX -> +88017XXXXXXXX
 * - 88017XXXXXXXX -> +88017XXXXXXXX
 * - +88017XXXXXXXX -> +88017XXXXXXXX
 * - Any international format (+1..., +44...)
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) return null;

  // Bangladeshi standard: 01[3-9]XXXXXXXX (11 digits)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }
  // Bangladeshi with 88: 8801[3-9]XXXXXXXX (13 digits)
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  // Bangladeshi already E.164: +8801[3-9]XXXXXXXX
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  // If already starts with +, keep as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return `+${cleaned}`;
}

/**
 * Generates an array of search variations for a phone number to match against the DB.
 * e.g. for "01711000003": returns ["+8801711000003", "01711000003", "8801711000003"]
 */
export function getPhoneSearchCandidates(rawPhone: string): string[] {
  const cleaned = rawPhone.trim().replace(/[\s\-()]/g, '');
  const candidates = new Set<string>();
  candidates.add(rawPhone.trim());
  candidates.add(cleaned);

  const normalized = normalizePhone(cleaned);
  if (normalized) {
    candidates.add(normalized);
    if (normalized.startsWith('+88')) {
      candidates.add(normalized.replace('+88', '')); // local e.g. 017...
      candidates.add(normalized.replace('+', '')); // 88017...
    }
  }

  return Array.from(candidates);
}
