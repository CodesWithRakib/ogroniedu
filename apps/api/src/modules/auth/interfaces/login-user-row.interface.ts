export interface LoginUserRow {
  id: string;
  email: string | null;
  phone_e164: string | null;
  password_hash: string | null;
  display_name: string;
  preferred_locale: 'bn' | 'en' | null;
  status: string;
  auth_epoch: number | string | null;
}
