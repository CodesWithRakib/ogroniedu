import { describe, it, expect } from 'vitest';
import { validateOnboardingPayload } from '../src/modules/onboarding/onboarding-validators';

const bilingual = {
  headline: 'Physics teacher for Class 9-12',
  headlineBn: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান শিক্ষক',
  bio: 'I teach Physics with a focus on problem solving.',
  bioBn: 'আমি সমস্যা সমাধানে জোর দিয়ে পদার্থবিজ্ঞান পড়াই।',
};

const validate = (payload: unknown) => validateOnboardingPayload('tutor_profile', payload);

describe('tutor onboarding profile validator', () => {
  it('accepts bilingual English and Bangla copy', () => {
    expect(validate(bilingual)).toBeNull();
  });

  it('requires a Bangla headline', () => {
    const { headlineBn: _headlineBn, ...englishOnly } = bilingual;
    expect(validate(englishOnly)).toMatch(/Bangla headline/);
  });

  it('requires a Bangla biography', () => {
    const { bioBn: _bioBn, ...withoutBioBn } = bilingual;
    expect(validate(withoutBioBn)).toMatch(/Bangla biography/);
  });

  it('requires an English headline, accepting the explicit headlineEn field', () => {
    const { headline: _headline, ...rest } = bilingual;
    expect(validate(rest)).toMatch(/English headline/);
    expect(validate({ ...rest, headlineEn: 'Physics teacher for Class 9-12' })).toBeNull();
  });

  it('rejects Bangla copy that is too short', () => {
    expect(validate({ ...bilingual, headlineBn: 'ছোট' })).toMatch(/Bangla headline/);
    expect(validate({ ...bilingual, bioBn: 'খুব ছোট' })).toMatch(/Bangla biography/);
  });

  it('rejects non-object payloads', () => {
    expect(validate('not-an-object')).toBe('payload must be an object');
  });
});
