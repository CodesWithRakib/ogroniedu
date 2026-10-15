/**
 * Pure auth-form validators (no React, no locale dependency — callers map
 * codes to localized messages). Covered by web/test/auth-forms.spec.ts.
 */

export type PasswordError = 'PASSWORD_TOO_SHORT' | 'PASSWORD_WEAK';
export type RegisterFieldError = 'NAME_TOO_SHORT' | 'CONTACT_REQUIRED' | PasswordError;
export type LoginFieldError = 'CREDENTIALS_REQUIRED';

/** Mirrors the backend password policy (min 8, upper+lower+digit). */
export function validatePassword(password: string): PasswordError | null {
  if (password.length < 8) return 'PASSWORD_TOO_SHORT';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'PASSWORD_WEAK';
  }
  return null;
}

export function validateRegisterFields(input: {
  displayName: string;
  email: string;
  phone: string;
  password: string;
}): RegisterFieldError | null {
  if (input.displayName.trim().length < 2) return 'NAME_TOO_SHORT';
  if (!input.email.trim() && !input.phone.trim()) return 'CONTACT_REQUIRED';
  return validatePassword(input.password);
}

export function validateLoginFields(input: {
  identifier: string;
  password: string;
}): LoginFieldError | null {
  if (!input.identifier.trim() || !input.password) return 'CREDENTIALS_REQUIRED';
  return null;
}
