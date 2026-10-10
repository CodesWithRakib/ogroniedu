import { describe, it, expect } from 'vitest';

describe('Frontend Notification UI & Localization Helpers', () => {
  const formatCount = (count: number, locale: 'bn' | 'en'): string => {
    if (count > 99) return locale === 'bn' ? '৯৯+' : '99+';
    if (locale === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(count)
        .split('')
        .map((d) => bnDigits[Number(d)] ?? d)
        .join('');
    }
    return String(count);
  };

  it('should format numerals to Bengali digits correctly', () => {
    expect(formatCount(0, 'bn')).toBe('০');
    expect(formatCount(3, 'bn')).toBe('৩');
    expect(formatCount(25, 'bn')).toBe('২৫');
    expect(formatCount(100, 'bn')).toBe('৯৯+');
  });

  it('should format numerals to English digits correctly', () => {
    expect(formatCount(0, 'en')).toBe('0');
    expect(formatCount(3, 'en')).toBe('3');
    expect(formatCount(25, 'en')).toBe('25');
    expect(formatCount(100, 'en')).toBe('99+');
  });

  it('should generate accessible aria labels in Bengali and English', () => {
    const count = 5;
    const ariaLabelBn = `বিজ্ঞপ্তি (${formatCount(count, 'bn')}টি অপঠিত)`;
    const ariaLabelEn = `Notifications (${count} unread)`;

    expect(ariaLabelBn).toBe('বিজ্ঞপ্তি (৫টি অপঠিত)');
    expect(ariaLabelEn).toBe('Notifications (5 unread)');
  });
});
