import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  validateRegisterFields,
  validateLoginFields,
} from '../src/components/auth/auth-validation';
import { isNavActive } from '../src/lib/navigation';

describe('auth form validators (Phase 23 P2-3)', () => {
  it('validatePassword enforces the backend policy', () => {
    expect(validatePassword('short')).toBe('PASSWORD_TOO_SHORT');
    expect(validatePassword('alllowercase1')).toBe('PASSWORD_WEAK');
    expect(validatePassword('ALLUPPERCASE1')).toBe('PASSWORD_WEAK');
    expect(validatePassword('NoDigitsHere')).toBe('PASSWORD_WEAK');
    expect(validatePassword('Abcdef12')).toBeNull();
  });

  it('validateRegisterFields checks name, contact, then password', () => {
    const base = { displayName: 'Rahim', email: 'r@x.com', phone: '', password: 'Abcdef12' };
    expect(validateRegisterFields(base)).toBeNull();
    expect(validateRegisterFields({ ...base, displayName: 'A' })).toBe('NAME_TOO_SHORT');
    expect(validateRegisterFields({ ...base, email: '', phone: '' })).toBe('CONTACT_REQUIRED');
    expect(validateRegisterFields({ ...base, password: 'weak' })).toBe('PASSWORD_TOO_SHORT');
  });

  it('validateLoginFields requires identifier and password', () => {
    expect(validateLoginFields({ identifier: '', password: '' })).toBe('CREDENTIALS_REQUIRED');
    expect(validateLoginFields({ identifier: 'a@b.co', password: '' })).toBe(
      'CREDENTIALS_REQUIRED',
    );
    expect(validateLoginFields({ identifier: 'a@b.co', password: 'x' })).toBeNull();
  });
});

describe('isNavActive (Phase 23 P2-3)', () => {
  it('matches exact hrefs and localized prefixes, never bare /dashboard', () => {
    expect(isNavActive('/bn/tutors', '/bn/tutors')).toBe(true);
    expect(isNavActive('/bn/admin?tab=users', '/bn/admin?tab=users')).toBe(true);
    expect(isNavActive('/bn/tutors/123', '/bn/tutors')).toBe(true);
    expect(isNavActive('/bn/login', '/bn/tutors')).toBe(false);
    expect(isNavActive('/bn/dashboard/student', '/dashboard')).toBe(false);
    expect(isNavActive(null, '/bn/tutors')).toBe(false);
  });
});
