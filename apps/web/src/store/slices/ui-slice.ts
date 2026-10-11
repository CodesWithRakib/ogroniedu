import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppTheme } from '@/lib/theme/themes';
import { DEFAULT_THEME } from '@/lib/theme/themes';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface UiState {
  isNotificationCenterOpen: boolean;
  activeLocale: 'bn' | 'en';
  /** @deprecated Legacy light/dark/system value. Use AppTheme via lib/theme instead. */
  theme: 'light' | 'dark' | 'system';
  appTheme: AppTheme;
  toasts: ToastMessage[];
}

const initialState: UiState = {
  isNotificationCenterOpen: false,
  activeLocale: 'bn',
  theme: 'system',
  appTheme: DEFAULT_THEME,
  toasts: [],
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleNotificationCenter: (state) => {
      state.isNotificationCenterOpen = !state.isNotificationCenterOpen;
    },
    setNotificationCenterOpen: (state, action: PayloadAction<boolean>) => {
      state.isNotificationCenterOpen = action.payload;
    },
    setActiveLocale: (state, action: PayloadAction<'bn' | 'en'>) => {
      state.activeLocale = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setAppTheme: (state, action: PayloadAction<AppTheme>) => {
      state.appTheme = action.payload;
    },
    enqueueToast: (state, action: PayloadAction<Omit<ToastMessage, 'id' | 'timestamp'>>) => {
      const newToast: ToastMessage = {
        ...action.payload,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      state.toasts.unshift(newToast);
      if (state.toasts.length > 5) {
        state.toasts.pop();
      }
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  toggleNotificationCenter,
  setNotificationCenterOpen,
  setActiveLocale,
  setTheme,
  setAppTheme,
  enqueueToast,
  removeToast,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
