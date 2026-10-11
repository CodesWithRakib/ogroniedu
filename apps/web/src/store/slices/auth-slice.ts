import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole =
  | 'student'
  | 'guardian'
  | 'tutor'
  | 'admin'
  | 'super_admin'
  | 'support_agent'
  | 'compliance_reviewer';

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
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  token: 'ogroniedu.accessToken',
  refreshToken: 'ogroniedu.refreshToken',
  user: 'ogroniedu.user',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readPersistedAuth(): Pick<AuthState, 'user' | 'token' | 'refreshToken'> {
  if (!isBrowser()) return { user: null, token: null, refreshToken: null };
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const rawUser = localStorage.getItem(STORAGE_KEYS.user);
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
    if (token && user?.id) return { user, token, refreshToken };
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
      if (state.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, state.refreshToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
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

export const { setCredentials, setSessionUser, setLoading, logout, setPreferredLocale } =
  authSlice.actions;
export const authReducer = authSlice.reducer;

/** Primary role used for dashboard routing (highest privilege first). */
export function primaryRole(roles: UserRole[] | undefined): UserRole | null {
  if (!roles || roles.length === 0) return null;
  const order: UserRole[] = [
    'super_admin',
    'admin',
    'support_agent',
    'compliance_reviewer',
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
    default:
      return '/dashboard';
  }
}
