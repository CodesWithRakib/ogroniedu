import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('GuardianAccessService (Phase 23 P2-6)', () => {
  let service: GuardianAccessService;
  let mockLinkRepo: any;

  const user = (id: string, roles: string[]): AuthenticatedUser => ({ id, roles });

  beforeEach(() => {
    mockLinkRepo = { findOne: vi.fn(), find: vi.fn() };
    service = new GuardianAccessService(mockLinkRepo);
  });

  it('hasActiveLink resolves true only for active links', async () => {
    mockLinkRepo.findOne.mockResolvedValueOnce({ status: 'active' });
    await expect(service.hasActiveLink('g-1', 's-1')).resolves.toBe(true);
    expect(mockLinkRepo.findOne).toHaveBeenCalledWith({
      where: { guardianUserId: 'g-1', studentUserId: 's-1', status: 'active' },
    });
    mockLinkRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.hasActiveLink('g-1', 's-9')).resolves.toBe(false);
  });

  it('assertCanAccessBooking allows participant, admin, and linked guardian', async () => {
    const booking = { tutorUserId: 't-1', requesterUserId: 'g-1', studentUserId: 's-1' };
    await expect(
      service.assertCanAccessBooking(user('t-1', ['tutor']), booking),
    ).resolves.toBeUndefined();
    await expect(
      service.assertCanAccessBooking(user('admin-1', ['admin']), booking),
    ).resolves.toBeUndefined();
    mockLinkRepo.findOne.mockResolvedValueOnce({ status: 'active' });
    await expect(
      service.assertCanAccessBooking(user('g-2', ['guardian']), booking),
    ).resolves.toBeUndefined();
    mockLinkRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.assertCanAccessBooking(user('stranger', ['student']), booking),
    ).rejects.toThrow(ForbiddenException);
  });

  it('findActiveStudentIds / findActiveGuardianIds map link rows to ids', async () => {
    mockLinkRepo.find.mockResolvedValueOnce([{ studentUserId: 's-1' }, { studentUserId: 's-2' }]);
    await expect(service.findActiveStudentIds('g-1')).resolves.toEqual(['s-1', 's-2']);
    mockLinkRepo.find.mockResolvedValueOnce([{ guardianUserId: 'g-1' }]);
    await expect(service.findActiveGuardianIds('s-1')).resolves.toEqual(['g-1']);
  });
});
