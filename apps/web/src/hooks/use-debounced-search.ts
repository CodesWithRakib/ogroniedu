'use client';

import React from 'react';

/** Debounce a fast-changing value (search input) to avoid request storms. */
export function useDebouncedSearch<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
