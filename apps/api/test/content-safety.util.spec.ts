import { describe, it, expect } from 'vitest';
import {
  normalizeBengaliDigits,
  inspectAndRedactContent,
} from '../src/modules/notifications/utils/content-safety.util';

describe('Content Safety & Anti-Circumvention Normalizer (Phase 08)', () => {
  describe('normalizeBengaliDigits', () => {
    it('converts Bengali numerals to ASCII numerals', () => {
      expect(normalizeBengaliDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
      expect(normalizeBengaliDigits('+৮৮০১৮১২৩৪৫৬৭৮')).toBe('+8801812345678');
      expect(normalizeBengaliDigits('রোল নম্বর: ৫')).toBe('রোল নম্বর: 5');
    });

    it('preserves ASCII digits and regular text', () => {
      expect(normalizeBengaliDigits('Chapter 3, Page 45')).toBe('Chapter 3, Page 45');
    });
  });

  describe('inspectAndRedactContent - Phone Number Detection', () => {
    it('redacts standard ASCII Bangladeshi phone numbers', () => {
      const res = inspectAndRedactContent('Please call me at 01712345678 for details');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('PHONE_NUMBER');
      expect(res.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
      expect(res.sanitizedContent).not.toContain('01712345678');
    });

    it('redacts +880 international format numbers', () => {
      const res = inspectAndRedactContent('Contact: +8801812345678 anytime');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('PHONE_NUMBER');
      expect(res.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
    });

    it('redacts Bengali numeral phone numbers', () => {
      const res = inspectAndRedactContent('আমার মোবাইল নম্বর ০১৭১২৩৪৫৬৭৮ কল করুন');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('PHONE_NUMBER');
      expect(res.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
      expect(res.sanitizedContent).not.toContain('০১৭১২৩৪৫৬৭৮');
    });

    it('redacts obfuscated phone numbers with spaces, dots, and dashes', () => {
      const res1 = inspectAndRedactContent('Call 0 1 7 1 2 3 4 5 6 7 8');
      expect(res1.isRedacted).toBe(true);
      expect(res1.violationCodes).toContain('PHONE_NUMBER');

      const res2 = inspectAndRedactContent('Ring me at 0.1.8.1.2.3.4.5.6.7.8');
      expect(res2.isRedacted).toBe(true);
      expect(res2.violationCodes).toContain('PHONE_NUMBER');
    });
  });

  describe('inspectAndRedactContent - Off-Platform Payment Solicitations', () => {
    it('redacts bKash and Nagad personal payment requests in English and Bengali', () => {
      const res1 = inspectAndRedactContent('Send money to my bkash personal number');
      expect(res1.isRedacted).toBe(true);
      expect(res1.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(res1.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');

      const res2 = inspectAndRedactContent('আমার বিকাশ নাম্বারে টাকা পাঠান');
      expect(res2.isRedacted).toBe(true);
      expect(res2.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(res2.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');
    });

    it('redacts cash in hand and direct handover solicitations', () => {
      const res = inspectAndRedactContent('হাতে হাতে টাকা দিয়ে দিয়েন');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(res.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');
    });
  });

  describe('inspectAndRedactContent - Social Media & External Bypass', () => {
    it('redacts WhatsApp direct click links and wa.me', () => {
      const res = inspectAndRedactContent('Chat with me on wa.me/8801711111111');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('EXTERNAL_LINK');
      expect(res.sanitizedContent).toContain('[REDACTED EXTERNAL LINK]');
    });

    it('redacts Telegram links and handles', () => {
      const res = inspectAndRedactContent('Join my channel at https://t.me/privatetutor');
      expect(res.isRedacted).toBe(true);
      expect(res.violationCodes).toContain('EXTERNAL_LINK');
      expect(res.sanitizedContent).toContain('[REDACTED EXTERNAL LINK]');
    });

    it('redacts external URLs', () => {
      const res = inspectAndRedactContent('Check my website www.tutorbd.com for direct rates');
      expect(res.isRedacted).toBe(true);
      expect(res.sanitizedContent).toContain('[REDACTED EXTERNAL LINK]');
    });
  });

  describe('inspectAndRedactContent - Clean Educational Messages', () => {
    it('permits clean academic communication without redaction', () => {
      const clean1 = 'Sir, tomorrow we have Physics class at 4 PM. Did you review chapter 5?';
      const res1 = inspectAndRedactContent(clean1);
      expect(res1.isRedacted).toBe(false);
      expect(res1.sanitizedContent).toBe(clean1);
      expect(res1.violationCodes).toHaveLength(0);

      const clean2 = 'কাল বিকেল ৫টায় রসায়ন ক্লাস শুরু হবে। বাড়ির কাজ তৈরি রাখবেন।';
      const res2 = inspectAndRedactContent(clean2);
      expect(res2.isRedacted).toBe(false);
      expect(res2.sanitizedContent).toBe(clean2);
    });
  });
});
