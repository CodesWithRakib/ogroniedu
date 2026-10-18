/**
 * Display names for the administrative codes the platform exposes in the
 * location picker (`GET /api/v1/taxonomy/locations`) plus the common
 * three-letter aliases used by tutor profiles.
 *
 * This is a *name* lookup only. It never supplies coordinates: a tutor's
 * service-area coordinate must be entered explicitly and is stored on
 * `tutor_service_areas`. Unknown codes fall back to the code itself rather
 * than inventing a place name.
 */
const LOCATION_NAMES: Record<string, { en: string; bn: string }> = {
  dhaka: { en: 'Dhaka', bn: 'ঢাকা' },
  dhk: { en: 'Dhaka', bn: 'ঢাকা' },
  chittagong: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  chattogram: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  ctg: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  sylhet: { en: 'Sylhet', bn: 'সিলেট' },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী' },
  khulna: { en: 'Khulna', bn: 'খুলনা' },
  barishal: { en: 'Barishal', bn: 'বরিশাল' },
  barisal: { en: 'Barishal', bn: 'বরিশাল' },
  rangpur: { en: 'Rangpur', bn: 'রংপুর' },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  comilla: { en: 'Cumilla', bn: 'কুমিল্লা' },
  cumilla: { en: 'Cumilla', bn: 'কুমিল্লা' },
  gazipur: { en: 'Gazipur', bn: 'গাজীপুর' },
  narayanganj: { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' },
  bogra: { en: 'Bogura', bn: 'বগুড়া' },
  bogura: { en: 'Bogura', bn: 'বগুড়া' },
};

export function resolveDistrictName(code: string | null | undefined): {
  en: string;
  bn: string;
} {
  if (!code) return { en: '', bn: '' };
  const normalized = code.trim().toLowerCase();
  const match = LOCATION_NAMES[normalized];
  if (match) return match;
  return { en: code.trim(), bn: code.trim() };
}
