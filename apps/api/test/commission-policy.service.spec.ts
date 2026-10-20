import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommissionPolicyService } from '../src/modules/payments/services/commission-policy.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('CommissionPolicyService', () => {
  let service: CommissionPolicyService;
  let mockPolicyRepo: any;
  let mockDataSource: any;
  let mockAuditService: any;

  const admin: AuthenticatedUser = { id: 'admin-1', email: 'a@example.com', roles: ['admin'] };

  beforeEach(() => {
    mockPolicyRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    mockDataSource = { transaction: vi.fn() };
    mockAuditService = { record: vi.fn().mockResolvedValue({}) };
    service = new CommissionPolicyService(mockPolicyRepo, mockDataSource, mockAuditService);
  });

  it('returns the active policy with the highest version', async () => {
    const policy = { id: 'p1', version: 4, platformFeeBps: 800, minPayoutMinor: '50000' };
    mockPolicyRepo.findOne.mockResolvedValue(policy);

    await expect(service.getActivePolicy()).resolves.toBe(policy);
    expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({
      where: { code: 'default', isActive: true },
      order: { version: 'DESC' },
    });
  });

  it('fails clearly when no policy is configured', async () => {
    mockPolicyRepo.findOne.mockResolvedValue(null);
    await expect(service.getActivePolicy()).rejects.toThrow(NotFoundException);
  });

  it('creates a new version, deactivates the previous one and audits the change', async () => {
    const current = {
      id: 'p1',
      code: 'default',
      version: 1,
      platformFeeBps: 800,
      isActive: true,
      effectiveTo: null,
    };
    const manager: any = {
      findOne: vi.fn().mockResolvedValue(current),
      create: vi.fn((_entity, data) => ({ ...data, id: 'p2' })),
      save: vi.fn(async (value) => value),
    };
    mockDataSource.transaction.mockImplementationOnce(async (cb: any) => cb(manager));

    const created = await service.createVersion(admin, {
      platformFeeBps: 1000,
      minPayoutMinor: 100000,
      notes: 'Raise commission',
    });

    expect(current.isActive).toBe(false);
    expect(current.effectiveTo).toBeInstanceOf(Date);
    expect(created.version).toBe(2);
    expect(created.platformFeeBps).toBe(1000);
    expect(created.minPayoutMinor).toBe('100000');
    expect(created.isActive).toBe(true);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'finance.commission_policy_created' }),
    );
  });

  it('rejects a platform fee above the 30% ceiling', async () => {
    await expect(
      service.createVersion(admin, { platformFeeBps: 3001, minPayoutMinor: 50000 }),
    ).rejects.toThrow(BadRequestException);
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('lists every stored version, newest first', async () => {
    const versions = [{ version: 2 }, { version: 1 }];
    mockPolicyRepo.find.mockResolvedValue(versions);

    await expect(service.listVersions()).resolves.toBe(versions);
    expect(mockPolicyRepo.find).toHaveBeenCalledWith({
      where: { code: 'default' },
      order: { version: 'DESC' },
    });
  });
});
