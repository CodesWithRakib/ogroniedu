import bnMessages from '../../messages/bn.json';
import enMessages from '../../messages/en.json';

export type Locale = 'bn' | 'en';
export type Dictionary = typeof bnMessages;

const dictionaries: Record<Locale, Dictionary> = {
  bn: bnMessages,
  en: enMessages,
};

/**
 * Synchronous dictionary getter for RSC and Client Components
 */
export function getDictionary(locale: string = 'bn'): Dictionary {
  const normalized: Locale = locale === 'en' ? 'en' : 'bn';
  return dictionaries[normalized];
}

/**
 * Format English numerals to Bengali digits if locale is bn
 */
export function formatLocalizedNumber(num: number | string, locale: Locale): string {
  if (locale !== 'bn') return String(num);

  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num)
    .split('')
    .map((char) => {
      const parsed = parseInt(char, 10);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? bnDigits[parsed] : char;
    })
    .join('');
}
