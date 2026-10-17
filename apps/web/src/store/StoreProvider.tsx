'use client';

import React, { useRef, useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from './store';
import { rehydrateAuth } from './slices/auth-slice';

export interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  useEffect(() => {
    // Ensure auth state is fully hydrated on client mount
    if (storeRef.current && !storeRef.current.getState().auth.token) {
      storeRef.current.dispatch(rehydrateAuth());
    }
  }, []);

  return React.createElement(Provider, { store: storeRef.current, children });
}
