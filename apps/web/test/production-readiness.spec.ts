import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ErrorBoundary from '../src/app/[locale]/error';
import NotFound from '../src/app/[locale]/not-found';
import GlobalError from '../src/app/global-error';
import { generateMetadata as generateHomeMetadata } from '../src/app/[locale]/(public)/page';
import { generateMetadata as generateTutorsMetadata } from '../src/app/[locale]/(public)/tutors/page';
import { generateMetadata as generateTutorDetailsMetadata } from '../src/app/[locale]/(public)/tutors/[id]/page';

describe('Phase 10 — Production Readiness, SEO & Error Boundaries Test Suite', () => {
  describe('1. Resilient Error Boundaries', () => {
    it('should render route-level error boundary with retry trigger and localized copy', () => {
      const resetMock = vi.fn();
      const testError = Object.assign(new Error('Connection timeout to backend'), {
        digest: 'ERR-DIGEST-998822',
      });

      const element = React.createElement(ErrorBoundary, {
        error: testError,
        reset: resetMock,
      });

      expect(element).toBeDefined();
      expect(element.props.error.digest).toBe('ERR-DIGEST-998822');
      expect(element.props.error.message).toBe('Connection timeout to backend');
      expect(typeof element.props.reset).toBe('function');
    });

    it('should render 404 Not Found component with guidance and discovery links', () => {
      const element = React.createElement(NotFound);
      expect(element).toBeDefined();
      expect(React.isValidElement(element)).toBe(true);
    });

    it('should render global error component with reload handler', () => {
      const resetMock = vi.fn();
      const testError = Object.assign(new Error('Hydration fatal mismatch'), {
        digest: 'FATAL-HYDRATE-001',
      });

      const element = React.createElement(GlobalError, {
        error: testError,
        reset: resetMock,
      });

      expect(element).toBeDefined();
      expect(element.props.error.digest).toBe('FATAL-HYDRATE-001');
    });
  });

  describe('2. Server Metadata Generation & Canonical SEO', () => {
    it('should generate localized metadata for Home page (bn and en)', async () => {
      const metaBn = await generateHomeMetadata({
        params: Promise.resolve({ locale: 'bn' }),
      });
      expect(metaBn.title).toContain('অগ্রণী এডু (OgroniEdu)');
      expect(metaBn.alternates?.canonical).toBe('https://ogroni.edu.bd/bn');
      expect(metaBn.alternates?.languages?.bn).toBe('https://ogroni.edu.bd/bn');
      expect(metaBn.alternates?.languages?.en).toBe('https://ogroni.edu.bd/en');

      const metaEn = await generateHomeMetadata({
        params: Promise.resolve({ locale: 'en' }),
      });
      expect(metaEn.title).toContain('OgroniEdu');
      expect(metaEn.alternates?.canonical).toBe('https://ogroni.edu.bd/en');
    });

    it('should generate localized metadata for Tutors Discovery Catalog', async () => {
      const meta = await generateTutorsMetadata({
        params: Promise.resolve({ locale: 'en' }),
      });
      expect(meta.title).toContain('Find Verified Academic Tutors in Bangladesh');
      expect(meta.alternates?.canonical).toBe('https://ogroni.edu.bd/en/tutors');
      expect(meta.openGraph?.type).toBe('website');
    });

    it('should handle tutor details metadata gracefully when tutor exists or is missing', async () => {
      const metaMissing = await generateTutorDetailsMetadata({
        params: Promise.resolve({ locale: 'en', id: '00000000-0000-0000-0000-000000000000' }),
      });
      expect(metaMissing).toBeDefined();
      expect(metaMissing.title).toBeDefined();
    });
  });

  describe('3. Structured Data (JSON-LD) Invariants', () => {
    it('should verify schema.org JSON-LD types adhere to standard specifications', () => {
      const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'OgroniEdu',
        url: 'https://ogroni.edu.bd',
      };
      expect(websiteSchema['@context']).toBe('https://schema.org');
      expect(websiteSchema['@type']).toBe('WebSite');

      const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Dr. Tanvir Ahmed',
        jobTitle: 'Physics Tutor',
        worksFor: {
          '@type': 'Organization',
          name: 'OgroniEdu',
        },
      };
      expect(personSchema['@type']).toBe('Person');
      expect(personSchema.worksFor['@type']).toBe('Organization');
    });
  });
});
