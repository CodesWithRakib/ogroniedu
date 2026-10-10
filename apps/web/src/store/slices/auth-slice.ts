import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'guardian' | 'tutor' | 'admin' | 'super_admin';
  preferredLocale: 'bn' | 'en';
  avatarUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'তানভীর আহমেদ (Tanvir Ahmed)',
    email: 'guardian@ogroniedu.com',
    role: 'guardian',
    preferredLocale: 'bn',
  },
  token: 'mock:11111111-1111-4111-a111-111111111111:guardian',
  isAuthenticated: true,
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setPreferredLocale: (state, action: PayloadAction<'bn' | 'en'>) => {
      if (state.user) {
        state.user.preferredLocale = action.payload;
      }
    },
  },
});

export const { setCredentials, logout, setPreferredLocale } = authSlice.actions;
export const authReducer = authSlice.reducer;
