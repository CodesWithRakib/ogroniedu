'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSessionUser, setLoading, logout } from '@/store/slices/auth-slice';
import { toAuthUser, useLazyGetSessionUserQuery } from '@/store/services/auth-api';

/**
 * Restores the persisted session on boot via the shared RTK Query client.
 * Runs once inside StoreProvider so refresh preserves authentication.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const [fetchMe] = useLazyGetSessionUserQuery();
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!token) {
        setDone(true);
        return;
      }
      dispatch(setLoading(true));
      try {
        const data = await fetchMe().unwrap();
        if (!cancelled) dispatch(setSessionUser(toAuthUser(data)));
      } catch {
        if (!cancelled) dispatch(logout());
      } finally {
        if (!cancelled) {
          dispatch(setLoading(false));
          setDone(true);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [dispatch, token, fetchMe]);

  void done;
  return <>{children}</>;
}
