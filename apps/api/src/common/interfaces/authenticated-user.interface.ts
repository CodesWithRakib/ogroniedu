export interface AuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  roles: string[];
  preferredLocale?: 'bn' | 'en';
  isImpersonated?: boolean;
  impersonatorUserId?: string | null;
}
