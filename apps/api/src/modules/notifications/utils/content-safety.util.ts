/**
 * Content Safety, Anti-Abuse & Anti-Circumvention Utilities for OgroniEdu.
 * Protects children under The Children Act 2013, prevents harassment/abuse,
 * and maintains escrow financial integrity.
 */

const BENGALI_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/** Convert Bengali numerals to ASCII numerals */
export function normalizeBengaliDigits(text: string): string {
  return text.replace(/[০-৯]/g, (match) => BENGALI_DIGITS[match] ?? match);
}

// Bangladeshi phone numbers:
// 11 digits starting with 013-019 (optionally with +88 prefix)
// Allows interspersed spaces, dots, dashes, or parentheses
const PHONE_PATTERN =
  /(?:(?:\+?88\s?|88)?0[\s.-]*)?1[\s.-]*[3-9][\s.-]*\d[\s.-]*\d[\s.-]*[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d/gi;

// Off-platform payment channels and cash handover solicitations
const PAYMENT_PATTERN =
  /(?:bkash(?:\s+personal|\s+number)?|nagad(?:\s+personal|\s+number)?|rocket(?:\s+personal|\s+number)?|upay|cellfin|send\s+money|send\s+cash|cash\s+in\s+hand|hand\s+cash|বিকাশ(?:\s+পার্সোনাল|\s+নাম্বার)?|নগদ(?:\s+পার্সোনাল|\s+নাম্বার)?|রকেট|উপায়|হাতে\s+হাতে\s+টাকা|হাতে\s+টাকা|ক্যাশ\s+টাকা)/gi;

// Social media direct circumvention channels
const SOCIAL_BYPASS_PATTERN =
  /(?:(?:https?:\/\/|www\.)?(?:wa\.me|t\.me|chat\.whatsapp\.com|facebook\.com|fb\.com|fb\.me|instagram\.com|discord\.gg|imo\.im)[^\s]*)|(?:(?:whatsapp|telegram|imo|discord)\s*[:=]\s*[^\s]+)/gi;

// External URLs
const EXTERNAL_LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s]+(?:\.com|\.me|\.org|\.net|\.xyz|\.io)/gi;

// Profanity, vulgar slurs, abusive language (Bengali & Banglish)
const BENGALI_PROFANITY_PATTERN =
  /(?:কুত্তা|শুয়োর|খানকি(?:র\s*ছেলে|র\s*পো)?|হারামজাদা|হারামখোর|চোদ(?:া|ি|ানি)?|মাদারচোদ|ভোদ(?:া)?|মারা\s*খা|বাল(?:ছাল)?|মাগি|বেশ্যা|নটির\s*পো|জারজ|দালাল|চিটার|বাটপার)/gi;

// Severe Threat / Violence / Harassment pattern
const THREAT_PATTERN =
  /(?:খুন\s*করব|মেরে\s*ফেলব|উড়িয়ে\s*দেব|ধ্বংস\s*করে\s*দেব|kill\s+you|threaten\s+you|beat\s+you\s+up)/gi;

// Profanity, vulgarity, offensive insults (English)
const ENGLISH_PROFANITY_PATTERN =
  /\b(?:fuck(?:ing|er)?|bitch|bastard|asshole|whore|slut|cunt|dick|pussy|scammer|fraudster)\b/gi;

export type SafetyViolationCode =
  | 'PHONE_NUMBER'
  | 'OFF_PLATFORM_PAYMENT'
  | 'EXTERNAL_LINK'
  | 'PROFANITY_ABUSE'
  | 'THREAT_HARASSMENT';

export interface SafetyCheckResult {
  sanitizedContent: string;
  isRedacted: boolean;
  redactionReason: string | null;
  violationCodes: SafetyViolationCode[];
  hasAbusiveLanguage: boolean;
  hasThreatOrHarassment: boolean;
  severity: 'none' | 'warning' | 'severe';
}

export function inspectAndRedactContent(content: string): SafetyCheckResult {
  const violations: SafetyViolationCode[] = [];
  const reasons: string[] = [];
  let hasAbusiveLanguage = false;
  let hasThreatOrHarassment = false;

  // 1. Bengali digit normalization for inspection
  const normalizedForDigits = normalizeBengaliDigits(content);
  let sanitized = content;

  // 2. Check for phone number circumvention (using normalized version to locate matches)
  if (PHONE_PATTERN.test(normalizedForDigits)) {
    PHONE_PATTERN.lastIndex = 0;
    sanitized = normalizeBengaliDigits(sanitized).replace(
      PHONE_PATTERN,
      '[REDACTED CONTACT NUMBER]',
    );
    violations.push('PHONE_NUMBER');
    reasons.push('Direct phone number sharing restricted for escrow and child safety');
  }

  // 3. Check for off-platform payment solicitations
  if (PAYMENT_PATTERN.test(sanitized)) {
    PAYMENT_PATTERN.lastIndex = 0;
    sanitized = sanitized.replace(PAYMENT_PATTERN, '[REDACTED PAYMENT SOLICITATION]');
    violations.push('OFF_PLATFORM_PAYMENT');
    reasons.push('Direct off-platform payment solicitations strictly prohibited');
  }

  // 4. Check for social media & external links
  if (SOCIAL_BYPASS_PATTERN.test(sanitized) || EXTERNAL_LINK_PATTERN.test(sanitized)) {
    SOCIAL_BYPASS_PATTERN.lastIndex = 0;
    EXTERNAL_LINK_PATTERN.lastIndex = 0;
    sanitized = sanitized
      .replace(SOCIAL_BYPASS_PATTERN, '[REDACTED EXTERNAL LINK]')
      .replace(EXTERNAL_LINK_PATTERN, '[REDACTED EXTERNAL LINK]');
    violations.push('EXTERNAL_LINK');
    reasons.push('External communication channels restricted for platform safety');
  }

  // 5. Check for Violent Threats / Harassment
  if (THREAT_PATTERN.test(sanitized)) {
    THREAT_PATTERN.lastIndex = 0;
    sanitized = sanitized.replace(THREAT_PATTERN, '[REDACTED THREAT / HARASSMENT]');
    violations.push('THREAT_HARASSMENT');
    reasons.push('Threats of violence, intimidation or severe harassment strictly prohibited');
    hasThreatOrHarassment = true;
  }

  // 6. Check for Profanity, Vulgar Words & Abusive Slurs
  if (BENGALI_PROFANITY_PATTERN.test(sanitized) || ENGLISH_PROFANITY_PATTERN.test(sanitized)) {
    BENGALI_PROFANITY_PATTERN.lastIndex = 0;
    ENGLISH_PROFANITY_PATTERN.lastIndex = 0;
    sanitized = sanitized
      .replace(BENGALI_PROFANITY_PATTERN, '[REDACTED INAPPROPRIATE CONTENT]')
      .replace(ENGLISH_PROFANITY_PATTERN, '[REDACTED INAPPROPRIATE CONTENT]');
    violations.push('PROFANITY_ABUSE');
    reasons.push('Inappropriate, vulgar or abusive language strictly prohibited on OgroniEdu');
    hasAbusiveLanguage = true;
  }

  const isRedacted = violations.length > 0;
  const redactionReason = isRedacted ? reasons.join('; ') : null;
  const severity: 'none' | 'warning' | 'severe' = hasThreatOrHarassment
    ? 'severe'
    : hasAbusiveLanguage || violations.includes('OFF_PLATFORM_PAYMENT')
      ? 'warning'
      : isRedacted
        ? 'warning'
        : 'none';

  return {
    sanitizedContent: sanitized,
    isRedacted,
    redactionReason,
    violationCodes: violations,
    hasAbusiveLanguage,
    hasThreatOrHarassment,
    severity,
  };
}
