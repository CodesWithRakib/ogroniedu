import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicService } from '../src/modules/public/public.service';

describe('Public platform stats (Phase 22 H-3)', () => {
  let service: PublicService;
  let mockDataSource: { query: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDataSource = { query: vi.fn() };
    service = new PublicService(mockDataSource as never);
  });

  it('maps count queries to the stats contract with a rounded rating', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ count: 128 }])
      .mockResolvedValueOnce([{ count: 940 }])
      .mockResolvedValueOnce([{ count: 312 }])
      .mockResolvedValueOnce([{ avg: 4.7 }]);
    const stats = await service.getPlatformStats();
    expect(stats).toEqual({
      verifiedTutors: 128,
      activeStudents: 940,
      completedSessions: 312,
      averageRating: 4.7,
    });
    expect(mockDataSource.query).toHaveBeenCalledTimes(4);
  });

  it('returns null averageRating when no reviews exist yet', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 10 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ avg: null }]);
    const stats = await service.getPlatformStats();
    expect(stats.averageRating).toBeNull();
    expect(stats.completedSessions).toBe(0);
  });

  it('sanitizes malformed rows to safe zeros instead of NaN', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([{ count: 'lots' }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ count: -5 }])
      .mockResolvedValueOnce([{ avg: Number.NaN }]);
    const stats = await service.getPlatformStats();
    expect(stats.verifiedTutors).toBe(0);
    expect(stats.activeStudents).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.averageRating).toBeNull();
  });

  it('propagates database failures (callers hide the band, never show zeros)', async () => {
    mockDataSource.query.mockRejectedValueOnce(new Error('connection refused'));
    await expect(service.getPlatformStats()).rejects.toThrow('connection refused');
  });
});
