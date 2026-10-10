import { describe, it, expect } from 'vitest';
import { getDictionary, formatLocalizedNumber } from '../src/lib/i18n';
import bnDict from '../messages/bn.json';
import enDict from '../messages/en.json';

describe('Bilingual Localization & Dictionary Parity Tests', () => {
  // Helper to collect all nested keys recursively
  const getNestedKeys = (obj: Record<string, any>, prefix = ''): string[] => {
    let keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(getNestedKeys(obj[key], fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  };

  it('should have exact key parity between Bengali and English dictionaries (zero missing keys)', () => {
    const bnKeys = getNestedKeys(bnDict).sort();
    const enKeys = getNestedKeys(enDict).sort();

    const missingInEn = bnKeys.filter((k) => !enKeys.includes(k));
    const missingInBn = enKeys.filter((k) => !bnKeys.includes(k));

    expect(missingInEn).toEqual([]);
    expect(missingInBn).toEqual([]);
    expect(bnKeys.length).toBe(enKeys.length);
    expect(bnKeys.length).toBeGreaterThan(25);
  });

  it('should return the correct dictionary via getDictionary for both locales', () => {
    const bn = getDictionary('bn');
    const en = getDictionary('en');

    expect(bn.common.appName).toContain('অগ্রণী এডু');
    expect(en.common.appName).toBe('OgroniEdu');

    // Default fallback to bn
    const defaultDict = getDictionary('unknown-locale');
    expect(defaultDict.common.appName).toContain('অগ্রণী এডু');
  });

  it('should correctly format numerals to localized Bengali digits and preserve English', () => {
    expect(formatLocalizedNumber(0, 'bn')).toBe('০');
    expect(formatLocalizedNumber(12345, 'bn')).toBe('১২৩৪৫');
    expect(formatLocalizedNumber(2026, 'bn')).toBe('২০২৬');

    expect(formatLocalizedNumber(0, 'en')).toBe('0');
    expect(formatLocalizedNumber(12345, 'en')).toBe('12345');
    expect(formatLocalizedNumber(2026, 'en')).toBe('2026');
  });
});
