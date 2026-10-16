export interface TokenPayload {
  sub: string;
  email?: string | null;
  phone?: string | null;
  roles: string[];
  preferredLocale: string;
  /** Monotonic credential epoch (users.auth_epoch) so stale tokens can be invalidated. */
  authEpoch?: number;
}

export interface AuthUserSummary {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  status: string;
  preferredLocale: string;
}

export interface AuthResponse {
  user: AuthUserSummary;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthMeta {
  userAgent?: string;
  ip?: string;
}
