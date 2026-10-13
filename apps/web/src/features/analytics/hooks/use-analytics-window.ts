'use client';

import React from 'react';

export type AnalyticsWindowPreset = '7d' | '30d' | '90d';

/** Feature-level analytics hook: owns the date-range preset shared by overview queries. */
export function useAnalyticsWindow(initial: AnalyticsWindowPreset = '30d') {
  const [preset, setPreset] = React.useState<AnalyticsWindowPreset>(initial);

  const onDateRangeChange = React.useCallback(async (next: AnalyticsWindowPreset) => {
    setPreset(next);
  }, []);

  return { preset, onDateRangeChange };
}
