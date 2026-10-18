import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SavedTutorsService } from '../src/modules/tutors/services/saved-tutors.service';

const userId = '11111111-1111-4111-8111-111111111111';
const tutorId = '22222222-2222-4222-8222-222222222222';
const otherUserId = '33333333-3333-4333-8333-333333333333';

describe('SavedTutorsService', () => {
  let service: SavedTutorsService;
  let mockRepo: any;
  let mockSearch: any;
  let rows: any[];

  beforeEach(() => {
    rows = [];
    mockRepo = {
      find: vi.fn(async ({ where }: any) => rows.filter((row) => row.userId === where.userId)),
      findOne: vi.fn(
        async ({ where }: any) =>
          rows.find(
            (row) => row.userId === where.userId && row.tutorUserId === where.tutorUserId,
          ) ?? null,
      ),
      create: vi.fn((data) => ({ createdAt: new Date(), ...data })),
      save: vi.fn(async (entity) => {
        rows.push(entity);
        return entity;
      }),
      delete: vi.fn(async ({ userId: uid, tutorUserId }: any) => {
        const before = rows.length;
        rows = rows.filter((row) => !(row.userId === uid && row.tutorUserId === tutorUserId));
        return { affected: before - rows.length };
      }),
    };
    mockSearch = {
      getPublicProfile: vi.fn(async (id: string) => ({ id, displayName: 'Tutor' })),
    };
    service = new SavedTutorsService(mockRepo, mockSearch);
  });

  it('saves a tutor for the authenticated user only', async () => {
    const result = await service.save(userId, tutorId);
    expect(result.tutorId).toBe(tutorId);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });

  it('is idempotent — a duplicate save keeps one row', async () => {
    await service.save(userId, tutorId);
    await service.save(userId, tutorId);
    expect(rows).toHaveLength(1);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('refuses self-save', async () => {
    await expect(service.save(userId, userId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an ineligible/nonexistent tutor without leaking the reason', async () => {
    mockSearch.getPublicProfile.mockRejectedValueOnce(new Error('not found'));
    await expect(service.save(userId, otherUserId)).rejects.toThrow();
  });

  it('lists only the caller rows and tolerates a tutor that became unavailable', async () => {
    await service.save(userId, tutorId);
    await service.save(otherUserId, tutorId);
    mockSearch.getPublicProfile.mockRejectedValueOnce(new Error('gone'));
    const list = await service.list(userId);
    expect(list).toHaveLength(1);
    expect(list[0].profile).toBeNull();
  });

  it('unsave is idempotent', async () => {
    await service.save(userId, tutorId);
    expect(await service.remove(userId, tutorId)).toEqual({ removed: true });
    expect(await service.remove(userId, tutorId)).toEqual({ removed: false });
  });

  it('never deletes another user saved row', async () => {
    await service.save(otherUserId, tutorId);
    const result = await service.remove(userId, tutorId);
    expect(result.removed).toBe(false);
    expect(rows).toHaveLength(1);
  });
});
