import { describe, it, expect } from 'vitest';
import {
  makeStore,
  setCredentials,
  logout,
  primaryRole,
  dashboardPathForRole,
} from '../src/store';
import { dashboardPathForRoles, withLocale, canAccessAdmin } from '../src/lib/auth';
import { normalizeApiError } from '../src/lib/api-error';

describe('Real auth session (Phase 21)', () => {
  it('boots logged out with no mock user', () => {
    const store = makeStore();
    const auth = store.getState().auth;
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.token).toBeNull();
  });

  it('stores credentials in session and clears them on logout', () => {
    const store = makeStore();
    store.dispatch(
      setCredentials({
        user: {
          id: 'user-1',
          displayName: 'Test Student',
          email: 's@example.com',
          phone: null,
          roles: ['student'],
          preferredLocale: 'bn',
        },
        token: 'access-123',
        refreshToken: 'refresh-123',
      }),
    );
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.token).toBe('access-123');

    store.dispatch(logout());
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });

  it('resolves primary role and dashboard paths per role', () => {
    expect(primaryRole(['student', 'guardian'])).toBe('guardian');
    expect(primaryRole(['tutor', 'student'])).toBe('tutor');
    expect(primaryRole(['admin', 'tutor'])).toBe('admin');
    expect(primaryRole(['super_admin', 'admin'])).toBe('super_admin');
    expect(dashboardPathForRole('student')).toBe('/dashboard/student');
    expect(dashboardPathForRole('guardian')).toBe('/dashboard/guardian');
    expect(dashboardPathForRole('tutor')).toBe('/dashboard/tutor');
    expect(dashboardPathForRole('admin')).toBe('/admin');
    expect(dashboardPathForRoles(['guardian'], 'bn')).toBe('/bn/dashboard/guardian');
    expect(withLocale('/dashboard', 'en')).toBe('/en/dashboard');
    expect(canAccessAdmin(['admin'])).toBe(true);
    expect(canAccessAdmin(['tutor'])).toBe(false);
  });

  it('normalizes API errors to localized messages', () => {
    expect(normalizeApiError({ status: 401 } as never, 'bn').message).toContain('সেশন');
    expect(normalizeApiError({ status: 401 } as never, 'en').message).toContain('session');
    expect(normalizeApiError({ status: 403 } as never, 'en').message).toContain('permission');
    expect(normalizeApiError({ status: 'FETCH_ERROR' } as never, 'bn').message).toContain(
      'সংযোগ',
    );
  });
});
