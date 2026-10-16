import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole =
  | 'student'
  | 'guardian'
  | 'tutor'
  | 'admin'
  | 'super_admin'
  | 'support_agent'
  | 'compliance_reviewer'
  | 'organization_owner'
  | 'organization_staff';

export interface AuthUser {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: UserRole[];
  status?: string;
  preferredLocale: 'bn' | 'en';
  avatarUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  /** Short-lived access token (persisted for reload resilience — see note below). */
  token: string | null;
  /**
   * Refresh token held **in memory only**. The web client never persists it:
   * the API sets it as an `HttpOnly` cookie which the browser sends with
   * `credentials: 'include'`. Persisting it in `localStorage` would hand any XSS
   * a long-lived credential and defeat the cookie design.
   */
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  token: 'ogroniedu.accessToken',
  user: 'ogroniedu.user',
  /** Legacy key purged on boot so pre-existing sessions stop leaking the token. */
  legacyRefreshToken: 'ogroniedu.refreshToken',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function readPersistedAuth(): Pick<AuthState, 'user' | 'token' | 'refreshToken'> {
  if (!isBrowser()) return { user: null, token: null, refreshToken: null };
  try {
    // Remove the legacy persisted refresh token if a previous build stored one.
    localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken);

    const token = localStorage.getItem(STORAGE_KEYS.token);
    const rawUser = localStorage.getItem(STORAGE_KEYS.user);
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
    if (token && user?.id) return { user, token, refreshToken: null };
  } catch {
    // Corrupt storage must never crash boot; start logged out.
  }
  return { user: null, token: null, refreshToken: null };
}

function persistAuth(state: Pick<AuthState, 'user' | 'token' | 'refreshToken'>): void {
  if (!isBrowser()) return;
  try {
    if (state.token && state.user) {
      localStorage.setItem(STORAGE_KEYS.token, state.token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
    // The refresh token is intentionally never written to web storage.
    localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken);
  } catch {
    // Storage quota / privacy mode: session continues in memory only.
  }
}

const persisted = readPersistedAuth();

const initialState: AuthState = {
  user: persisted.user,
  token: persisted.token,
  refreshToken: persisted.refreshToken,
  isAuthenticated: Boolean(persisted.token && persisted.user),
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    rehydrateAuth: (state) => {
      const stored = readPersistedAuth();
      if (stored.token && stored.user) {
        state.user = stored.user;
        state.token = stored.token;
        state.refreshToken = stored.refreshToken;
        state.isAuthenticated = true;
      }
      state.isLoading = false;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; token: string; refreshToken?: string | null }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.isAuthenticated = true;
      state.isLoading = false;
      persistAuth(state);
    },
    setSessionUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(state.token && action.payload);
      state.isLoading = false;
      persistAuth(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      persistAuth(state);
    },
    setPreferredLocale: (state, action: PayloadAction<'bn' | 'en'>) => {
      if (state.user) {
        state.user.preferredLocale = action.payload;
        persistAuth(state);
      }
    },
  },
});

export const {
  rehydrateAuth,
  setCredentials,
  setSessionUser,
  setLoading,
  logout,
  setPreferredLocale,
} = authSlice.actions;
export const authReducer = authSlice.reducer;

/** Primary role used for dashboard routing (highest privilege first). */
export function primaryRole(roles: UserRole[] | undefined): UserRole | null {
  if (!roles || roles.length === 0) return null;
  const order: UserRole[] = [
    'super_admin',
    'admin',
    'support_agent',
    'compliance_reviewer',
    'organization_owner',
    'organization_staff',
    'tutor',
    'guardian',
    'student',
  ];
  for (const role of order) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? null;
}

/** Canonical dashboard path for a role. Used by login + role router. */
export function dashboardPathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'tutor':
      return '/dashboard/tutor';
    case 'guardian':
      return '/dashboard/guardian';
    case 'student':
      return '/dashboard/student';
    case 'support_agent':
    case 'compliance_reviewer':
      return '/admin';
    case 'organization_owner':
    case 'organization_staff':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}
