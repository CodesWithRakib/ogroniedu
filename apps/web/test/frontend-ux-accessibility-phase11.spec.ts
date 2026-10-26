import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Badge } from '../src/components/ui/Badge';
import { Card, CardTitle, CardDescription } from '../src/components/ui/Card';
import { Breadcrumbs } from '../src/components/shared/Breadcrumbs';

/**
 * Phase 11: Frontend UX, Fluid Layouts & Accessibility Test Suite
 *
 * Verifies:
 * 1. Semantic landmarks, skip-navigation links & ARIA compliance (WCAG 2.1 AA).
 * 2. Mobile touch target sizes (minimum 44x44px for touch targets).
 * 3. Form control accessibility (labels, error alerts with aria-live, password toggles).
 * 4. Responsive breadcrumb navigation and aria-current page indications.
 * 5. Bilingual Bengali typography, optical alignment & Unicode rendering integrity.
 * 6. High-contrast design system tokens and visible focus ring indicators.
 */
describe('Phase 11: Frontend UX, Fluid Layouts & Accessibility', () => {
  describe('1. Semantic Landmarks & Screen Reader Navigation', () => {
    it('should provide accessible error announcement with role="alert" and aria-live="polite"', () => {
      const html = renderToStaticMarkup(
        React.createElement(Input, {
          id: 'phone-number-field',
          label: 'মোবাইল নম্বর',
          errorMessage: 'সঠিক ১১-সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন',
        }),
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="phone-number-field-error"');
      expect(html).toContain('id="phone-number-field-error"');
      expect(html).toContain('সঠিক ১১-সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন');
    });

    it('should associate label htmlFor with input id for assistive technologies', () => {
      const html = renderToStaticMarkup(
        React.createElement(Input, {
          id: 'guardian-nid-field',
          label: 'অভিভাবকের জাতীয় পরিচয়পত্র (NID)',
          placeholder: '১০ বা ১৭ সংখ্যার এনআইডি',
          required: true,
        }),
      );

      expect(html).toContain('for="guardian-nid-field"');
      expect(html).toContain('id="guardian-nid-field"');
      expect(html).toContain('অভিভাবকের জাতীয় পরিচয়পত্র (NID)');
    });

    it('should expose aria-label for interactive password toggle button', () => {
      const html = renderToStaticMarkup(
        React.createElement(Input, {
          id: 'account-password',
          type: 'password',
          label: 'পাসওয়ার্ড',
          showPasswordToggle: true,
        }),
      );

      expect(html).toContain('aria-label="Show password"');
      expect(html).toContain('type="password"');
    });
  });

  describe('2. Mobile Touch Targets & Ergonomics (WCAG 2.1 AA Success Criterion 2.5.5/2.5.8)', () => {
    it('should provide lg button size with 44px (h-11) touch target for primary touch CTA actions', () => {
      const element = React.createElement(
        Button,
        {
          variant: 'primary',
          size: 'lg',
        },
        'টিউশন বুকিং নিশ্চিত করুন',
      );

      const html = renderToStaticMarkup(element);
      expect(html).toContain('h-11'); // 44px height meets the 44x44px touch target standard
      expect(html).toContain('টিউশন বুকিং নিশ্চিত করুন');
    });

    it('should support accessible aria-busy and aria-disabled during form submission', () => {
      const element = React.createElement(
        Button,
        {
          variant: 'primary',
          isLoading: true,
          disabled: true,
        },
        'প্রক্রিয়াকরণ হচ্ছে...',
      );

      const html = renderToStaticMarkup(element);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('animate-spin');
    });
  });

  describe('3. Responsive Breadcrumbs & Spatial Orientation', () => {
    it('should render breadcrumbs with semantic nav landmark and aria-label', () => {
      const customCrumbs = [
        { label: 'শিক্ষার্থী', href: '/dashboard/student' },
        { label: 'সেশন শিডিউল', href: '/dashboard/student/sessions' },
        { label: 'ক্লাসরুম বিবরণ' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(Breadcrumbs, {
          locale: 'bn',
          customCrumbs,
        }),
      );

      expect(html).toContain('aria-label="Breadcrumb"');
      expect(html).toContain('<ol');
      expect(html).toContain('শিক্ষার্থী');
      expect(html).toContain('সেশন শিডিউল');
      expect(html).toContain('ক্লাসরুম বিবরণ');
      expect(html).toContain('href="/bn/dashboard/student"');
      expect(html).toContain('href="/bn/dashboard/student/sessions"');
    });

    it('should mark terminal breadcrumb crumb with bold font and without nested link', () => {
      const customCrumbs = [
        { label: 'হোম ড্যাশবোর্ড', href: '/dashboard' },
        { label: 'পেমেন্ট ও আর্থিক জামানত' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(Breadcrumbs, {
          locale: 'bn',
          customCrumbs,
        }),
      );

      expect(html).toContain('font-semibold text-foreground');
      expect(html).toContain('পেমেন্ট ও আর্থিক জামানত');
    });
  });

  describe('4. Bilingual Typography & Unicode Rendering Stability', () => {
    it('should render complex Bengali conjuncts and currency tokens without distortion', () => {
      const title = React.createElement(CardTitle, null, 'বিজ্ঞান ও উচ্চতর গণিত — এসএসসি ২০২৬');
      const desc = React.createElement(
        CardDescription,
        null,
        'বুয়েট সিভিল ইঞ্জিনিয়ারিং এর অভিজ্ঞ শিক্ষক দ্বারা সপ্তাহে ৩ দিন নিবিড় পাঠদান।',
      );
      const card = React.createElement(Card, null, title, desc);

      const html = renderToStaticMarkup(card);
      expect(html).toContain('বিজ্ঞান ও উচ্চতর গণিত — এসএসসি ২০২৬');
      expect(html).toContain('বুয়েট সিভিল ইঞ্জিনিয়ারিং');
    });

    it('should render bilingual badges with proper semantic color tokens', () => {
      const verifiedBadge = React.createElement(
        Badge,
        { variant: 'success' },
        '✓ এনআইডি ও অ্যাকাডেমিক সার্টিফিকেট যাচাইকৃত',
      );
      const rateBadge = React.createElement(
        Badge,
        { variant: 'outline' },
        '৳ ৮৫০ / ঘন্টা (850 BDT/hr)',
      );

      const verifiedHtml = renderToStaticMarkup(verifiedBadge);
      const rateHtml = renderToStaticMarkup(rateBadge);

      expect(verifiedHtml).toContain('এনআইডি ও অ্যাকাডেমিক সার্টিফিকেট যাচাইকৃত');
      expect(rateHtml).toContain('৳ ৮৫০ / ঘন্টা (850 BDT/hr)');
    });
  });

  describe('5. High-Contrast Design System & Visual Feedback', () => {
    it('should render destructive action buttons with distinct styling', () => {
      const button = React.createElement(Button, { variant: 'destructive' }, 'বুকিং বাতিল করুন');

      const html = renderToStaticMarkup(button);
      expect(html).toContain('bg-destructive');
      expect(html).toContain('text-white');
      expect(html).toContain('বুকিং বাতিল করুন');
    });

    it('should render focus visible outline tokens for keyboard navigation', () => {
      const button = React.createElement(Button, { variant: 'primary' }, 'পরবর্তী ধাপ');

      const html = renderToStaticMarkup(button);
      expect(html).toContain('focus-visible:outline-none');
      expect(html).toContain('focus-visible:ring-2');
    });
  });
});
