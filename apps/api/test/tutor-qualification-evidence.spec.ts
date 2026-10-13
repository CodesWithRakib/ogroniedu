import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorProfileService } from '../src/modules/tutors/services/tutor-profile.service';

/**
 * Regression tests for evidence-linked qualification creation.
 * Pins the fix for the 500 caused by `deletedAt: undefined` in the
 * file-asset lookup: TypeORM `where` criteria must never contain
 * undefined values (use IsNull() for nullable columns).
 */
describe('TutorProfileService.addQualification evidence linkage', () => {
  const tutorId = '22222222-2222-4222-b222-222222222222';
  const fileId = '25148e35-4784-4176-af78-aaa9c2d96dad';

  let service: TutorProfileService;
  let mockProfileRepo: any;
  let mockQualificationRepo: any;
  let mockSubjectRepo: any;
  let mockServiceAreaRepo: any;
  let mockAvailabilityRepo: any;
  let mockFileRepo: any;
  let mockUserRepo: any;
  let mockAuditService: any;
  let capturedWhere: any;

  beforeEach(() => {
    capturedWhere = undefined;
    mockProfileRepo = {
      findOne: vi.fn(async () => ({ userId: tutorId })),
      create: vi.fn((dto: any) => ({ ...dto })),
      save: vi.fn(async (e: any) => ({ ...e })),
    };
    mockQualificationRepo = {
      create: vi.fn((dto: any) => ({ ...dto, id: 'qual-uuid-9' })),
      save: vi.fn(async (e: any) => ({ ...e, id: e.id ?? 'qual-uuid-9' })),
    };
    mockSubjectRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    mockServiceAreaRepo = { find: vi.fn(), delete: vi.fn(), create: vi.fn(), save: vi.fn() };
    mockAvailabilityRepo = { find: vi.fn(), delete: vi.fn(), create: vi.fn(), save: vi.fn() };
    mockFileRepo = {
      findOne: vi.fn(async (opts: any) => {
        capturedWhere = opts?.where;
        return { id: fileId, ownerUserId: tutorId };
      }),
    };
    mockUserRepo = { findOne: vi.fn() };
    mockAuditService = { record: vi.fn(async () => ({})) };

    service = new TutorProfileService(
      mockProfileRepo,
      mockQualificationRepo,
      mockSubjectRepo,
      mockServiceAreaRepo,
      mockAvailabilityRepo,
      mockFileRepo,
      mockUserRepo,
      mockAuditService,
    ) as never;
  });

  it('links an owned evidence file and never queries with undefined criteria', async () => {
    const saved = await service.addQualification(tutorId, {
      qualificationType: 'nid',
      title: 'National ID Card',
      institution: 'Election Commission',
      evidenceAssetId: fileId,
    } as any);

    expect(mockFileRepo.findOne).toHaveBeenCalledOnce();
    expect(capturedWhere).toBeDefined();
    expect(capturedWhere.id).toBe(fileId);
    for (const value of Object.values(capturedWhere)) {
      expect(value).not.toBeUndefined();
    }
    expect(saved.evidenceAssetId).toBe(fileId);
    expect(saved.reviewStatus).toBe('pending');
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tutor.qualification.added' }),
    );
  });

  it('rejects an evidence file owned by another user (403 boundary)', async () => {
    mockFileRepo.findOne.mockResolvedValueOnce({ id: fileId, ownerUserId: 'someone-else' });
    await expect(
      service.addQualification(tutorId, {
        qualificationType: 'nid',
        title: 'National ID Card',
        evidenceAssetId: fileId,
      } as any),
    ).rejects.toThrow(/does not exist or does not belong/i);
  });

  it('rejects a missing evidence file', async () => {
    mockFileRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.addQualification(tutorId, {
        qualificationType: 'degree',
        title: 'BSc',
        evidenceAssetId: '00000000-0000-4000-8000-000000000000',
      } as any),
    ).rejects.toThrow(/does not exist or does not belong/i);
  });
});
