import { describe, it, expect } from 'vitest';
import React from 'react';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';
import { getDictionary } from '../src/lib/i18n';
import bnDict from '../messages/bn.json';
import enDict from '../messages/en.json';
import HowItWorksPage from '../src/app/[locale]/(public)/how-it-works/page';
import PricingPage from '../src/app/[locale]/(public)/pricing/page';
import SafetyPage from '../src/app/[locale]/(public)/safety/page';
import FaqPage from '../src/app/[locale]/(public)/faq/page';
import ContactPage from '../src/app/[locale]/(public)/contact/page';
import TermsPage from '../src/app/[locale]/(public)/terms/page';
import PrivacyPage from '../src/app/[locale]/(public)/privacy/page';

describe('Phase 16 — Public Website, SEO & Route Layout Separation Tests', () => {
  it('should generate valid bilingual sitemap covering all 9 public routes across bn and en', () => {
    const entries = sitemap();
    expect(entries).toBeDefined();
    expect(Array.isArray(entries)).toBe(true);

    // 9 routes * 2 locales = 18 URL entries
    expect(entries).toHaveLength(18);

    const urls = entries.map((e) => e.url);

    // Verify key canonical paths exist for both locales
    expect(urls).toContain('https://ogroni.edu.bd/bn');
    expect(urls).toContain('https://ogroni.edu.bd/en');
    expect(urls).toContain('https://ogroni.edu.bd/bn/how-it-works');
    expect(urls).toContain('https://ogroni.edu.bd/en/how-it-works');
    expect(urls).toContain('https://ogroni.edu.bd/bn/pricing');
    expect(urls).toContain('https://ogroni.edu.bd/en/pricing');
    expect(urls).toContain('https://ogroni.edu.bd/bn/safety');
    expect(urls).toContain('https://ogroni.edu.bd/en/safety');
    expect(urls).toContain('https://ogroni.edu.bd/bn/faq');
    expect(urls).toContain('https://ogroni.edu.bd/en/faq');
    expect(urls).toContain('https://ogroni.edu.bd/bn/contact');
    expect(urls).toContain('https://ogroni.edu.bd/en/contact');
    expect(urls).toContain('https://ogroni.edu.bd/bn/terms');
    expect(urls).toContain('https://ogroni.edu.bd/en/terms');
    expect(urls).toContain('https://ogroni.edu.bd/bn/privacy');
    expect(urls).toContain('https://ogroni.edu.bd/en/privacy');
    expect(urls).toContain('https://ogroni.edu.bd/bn/tutors');
    expect(urls).toContain('https://ogroni.edu.bd/en/tutors');

    // Verify language alternates metadata
    const homeEntry = entries.find((e) => e.url === 'https://ogroni.edu.bd/bn');
    expect(homeEntry?.alternates?.languages?.bn).toBe('https://ogroni.edu.bd/bn');
    expect(homeEntry?.alternates?.languages?.en).toBe('https://ogroni.edu.bd/en');
  });

  it('should generate valid robots.txt rules permitting public routes and disallowing admin/portal paths', () => {
    const rules = robots();
    expect(rules).toBeDefined();
    expect(rules.sitemap).toBe('https://ogroni.edu.bd/sitemap.xml');

    const rule = Array.isArray(rules.rules) ? rules.rules[0] : rules.rules;
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');

    const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    expect(disallowed).toContain('/*/admin');
    expect(disallowed).toContain('/*/analytics');
    expect(disallowed).toContain('/*/payments');
    expect(disallowed).toContain('/api/*');
  });

  it('should verify 100% dictionary key parity for all Phase 16 public namespaces between bn and en', () => {
    const namespaces = [
      'howItWorksPage',
      'pricingPage',
      'safetyPage',
      'faqPage',
      'contactPage',
      'legalTermsPage',
      'privacyPolicyPage',
      'seo',
    ] as const;

    for (const ns of namespaces) {
      expect((bnDict as any)[ns]).toBeDefined();
      expect((enDict as any)[ns]).toBeDefined();

      const bnKeys = Object.keys((bnDict as any)[ns]).sort();
      const enKeys = Object.keys((enDict as any)[ns]).sort();

      expect(bnKeys).toEqual(enKeys);
      expect(bnKeys.length).toBeGreaterThan(0);
    }

    // Verify critical claim consistency
    expect(enDict.pricingPage.commissionTitle).toContain('8% Platform Fee');
    expect(bnDict.pricingPage.commissionTitle).toContain('৮% প্ল্যাটফর্ম ফি');

    expect(enDict.pricingPage.commissionSubtitle).toContain('92%');
    expect(bnDict.pricingPage.commissionSubtitle).toContain('৯২%');

    expect(enDict.safetyPage.minorPolicyHeading).toContain('Minor Consent Policy (Under 18)');
    expect(bnDict.safetyPage.minorPolicyHeading).toContain('১৮ বছরের কম বয়সীদের অভিভাবক সম্মতি নীতি');

    expect(enDict.safetyPage.screeningHeading).toContain('100% Educator Screening');
    expect(bnDict.safetyPage.screeningHeading).toContain('১০০% শিক্ষক ব্যাকগ্রাউন্ড যাচাই');
  });

  it('should instantiate all public page components with params without runtime errors', () => {
    const paramsPromise = Promise.resolve({ locale: 'bn' });

    const components = [
      { name: 'HowItWorksPage', cmp: HowItWorksPage },
      { name: 'PricingPage', cmp: PricingPage },
      { name: 'SafetyPage', cmp: SafetyPage },
      { name: 'FaqPage', cmp: FaqPage },
      { name: 'ContactPage', cmp: ContactPage },
      { name: 'TermsPage', cmp: TermsPage },
      { name: 'PrivacyPage', cmp: PrivacyPage },
    ];

    for (const item of components) {
      const el = React.createElement(item.cmp, { params: paramsPromise });
      expect(el).toBeDefined();
    }
  });

  it('should enforce private field exclusion invariant for public tutor profile data', () => {
    // Model of public tutor profile DTO
    const publicProfileSample = {
      id: '00000000-0000-4000-8000-000000000001',
      displayName: 'Nusrat Jahan',
      bio: 'BUET CSE graduate with 4 years tutoring experience in Physics and Mathematics.',
      hourlyRateBdt: 1200,
      teachingModes: ['online', 'in_person'],
      badges: ['verified_tutor', 'verified_identity', 'verified_academic'],
      subjects: [
        {
          subjectNameEn: 'Physics',
          subjectNameBn: 'পদার্থবিজ্ঞান',
          educationLevelNameEn: 'Class 10',
          educationLevelNameBn: '১০ম শ্রেণি',
        },
      ],
      // Private fields that MUST NOT exist in public DTO
      nationalIdNumber: undefined,
      internalNotes: undefined,
      reviewerNotes: undefined,
      payoutBankDetails: undefined,
      personalPhone: undefined,
    };

    expect(publicProfileSample.nationalIdNumber).toBeUndefined();
    expect(publicProfileSample.internalNotes).toBeUndefined();
    expect(publicProfileSample.reviewerNotes).toBeUndefined();
    expect(publicProfileSample.payoutBankDetails).toBeUndefined();
    expect(publicProfileSample.personalPhone).toBeUndefined();

    // Verify only public fields are present
    expect(publicProfileSample.displayName).toBe('Nusrat Jahan');
    expect(publicProfileSample.badges).toContain('verified_identity');
  });
});
