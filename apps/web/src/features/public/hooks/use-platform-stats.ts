'use client';

import { useGetPlatformStatsQuery } from '@/store/services/public-api';
import { parseItem } from '@/lib/api/parse';

export interface PlatformStatsView {
  verifiedTutors: number;
  activeStudents: number;
  completedSessions: number;
  averageRating: number | null;
}

/**
 * Live platform aggregates for the public hero band.
 * On error the band hides (never show fabricated numbers).
 */
export function usePlatformStats() {
  const query = useGetPlatformStatsQuery();
  let stats: PlatformStatsView | null = null;
  if (query.data) {
    try {
      stats = parseItem<PlatformStatsView>(query.data);
    } catch {
      stats = null;
    }
  }
  return {
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
