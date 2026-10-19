import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildStepPayload, fieldsForStep } from '../src/features/onboarding/step-forms';
import { authApi } from '../src/store/services/auth-api';
import { onboardingApi } from '../src/store/services/onboarding-api';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    has: (key: string) => map.has(key),
    map,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('web credential storage hardening (SEC-5)', () => {
  it('never persists the refresh token and purges the legacy key', async () => {
    vi.resetModules();
    const storage = memoryStorage({ 'ogroniedu.refreshToken': 'legacy-rotated-token' });
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);

    const authSlice = await import('../src/store/slices/auth-slice');
    const storeModule = await import('../src/store/store');

    // Boot purges any refresh token left behind by an older build.
    expect(storage.has('ogroniedu.refreshToken')).toBe(false);

    const store = storeModule.makeStore();
    store.dispatch(
      authSlice.setCredentials({
        user: {
          id: 'user-1',
          displayName: 'Learner',
          email: 'learner@example.com',
          phone: null,
          roles: ['student'],
          preferredLocale: 'bn',
        },
        token: 'access-1',
        refreshToken: 'refresh-should-stay-in-memory',
      }),
    );

    expect(storage.has('ogroniedu.refreshToken')).toBe(false);
    expect(storage.getItem('ogroniedu.accessToken')).toBe('access-1');
    expect(store.getState().auth.refreshToken).toBe('refresh-should-stay-in-memory');

    store.dispatch(authSlice.logout());
    expect(storage.has('ogroniedu.accessToken')).toBe(false);
    expect(storage.has('ogroniedu.user')).toBe(false);
  });

  it('does not write a JS-readable access_token cookie', async () => {
    vi.resetModules();
    const storage = memoryStorage();
    const documentStub = { cookie: '' };
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('document', documentStub);

    const authSlice = await import('../src/store/slices/auth-slice');
    authSlice.authReducer(undefined, {
      type: 'auth/setCredentials',
      payload: {
        user: {
          id: 'u',
          displayName: 'U',
          email: null,
          phone: null,
          roles: ['student'],
          preferredLocale: 'bn',
        },
        token: 'a',
        refreshToken: 'r',
      },
    });

    expect(documentStub.cookie).toBe('');
  });
});

describe('auth API surface (Phase 01)', () => {
  it('exposes magic-link request/consume endpoints', () => {
    expect(authApi.endpoints.requestMagicLink).toBeDefined();
    expect(authApi.endpoints.consumeMagicLink).toBeDefined();
  });

  it('exposes onboarding status and step endpoints', () => {
    expect(onboardingApi.endpoints.getMyOnboarding).toBeDefined();
    expect(onboardingApi.endpoints.completeOnboardingStep).toBeDefined();
  });
});

describe('onboarding step payloads', () => {
  it('resolves role-specific profile fields', () => {
    expect(fieldsForStep('student', 'profile').map((f) => f.name)).toContain('institutionName');
    expect(fieldsForStep('tutor', 'profile').map((f) => f.name)).toContain('headline');
    expect(fieldsForStep('tutor', 'profile').map((f) => f.name)).toContain('headlineBn');
    expect(fieldsForStep('tutor', 'profile').map((f) => f.name)).toContain('bioBn');
    expect(fieldsForStep('guardian', 'profile').map((f) => f.name)).toContain('relationshipType');
    expect(fieldsForStep('admin', 'security_setup')).toEqual([
      expect.objectContaining({ name: 'acknowledgePolicy', kind: 'checkbox' }),
    ]);
    expect(fieldsForStep('student', 'unknown_step')).toEqual([]);
  });

  it('wraps qualification and document fields into the server collection shape', () => {
    expect(
      buildStepPayload('education', { title: 'BSc', type: 'degree', institution: 'BUET' }),
    ).toEqual({
      qualifications: [
        { title: 'BSc', type: 'degree', institution: 'BUET', issuedYear: undefined },
      ],
    });

    expect(buildStepPayload('documents', { fileAssetId: 'f1', documentType: 'nid' })).toEqual({
      documents: [{ fileAssetId: 'f1', documentType: 'nid' }],
    });
  });

  it('maps the security acknowledgement checkbox to a boolean policy flag', () => {
    expect(buildStepPayload('security_setup', { acknowledgePolicy: true })).toEqual({
      acknowledgePolicy: true,
    });
    expect(buildStepPayload('security_setup', {})).toEqual({ acknowledgePolicy: false });
  });
});
