import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuardiansService } from '../src/modules/guardians/guardians.service';
import { GuardianProvisioningService } from '../src/modules/guardians/services/guardian-provisioning.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserEntity } from '../src/modules/auth/entities/user.entity';
import { RoleEntity } from '../src/modules/auth/entities/role.entity';
import { GuardianStudentLinkEntity } from '../src/modules/guardians/entities/guardian-student-link.entity';

describe('GuardiansService Unit & Ownership Tests', () => {
  let service: GuardiansService;
  let mockUserRepo: any;
  let mockRoleRepo: any;
  let mockUserRoleRepo: any;
  let mockStudentProfileRepo: any;
  let mockLinkRepo: any;
  let mockAuditService: any;
  let mockDataSource: any;

  const guardianUser: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Md. Anwar Hossain',
    email: 'anwar@example.com',
    avatarUrl: null,
    phoneE164: '+8801711111111',
    passwordHash: 'hash',
    preferredLocale: 'bn',
    status: 'active',
    authEpoch: 1,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const studentUser: UserEntity = {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Tanvir Hossain',
    email: 'tanvir@example.com',
    avatarUrl: null,
    phoneE164: '+8801722222222',
    passwordHash: 'hash',
    preferredLocale: 'bn',
    status: 'active',
    authEpoch: 1,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
      create: vi.fn((data) => ({ id: 'new-student-uuid', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'saved-id', ...entity })),
    };

    mockRoleRepo = {
      findOne: vi.fn(),
    };

    mockUserRoleRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockStudentProfileRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockLinkRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data) => ({ id: 'link-uuid-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'link-uuid-1', ...entity })),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockDataSource = {
      createQueryRunner: vi.fn(() => ({
        connect: vi.fn(),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn(),
        manager: {
          create: vi.fn((entityClass, data) => ({ id: 'gen-uuid', ...data })),
          save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'saved-uuid', ...entity })),
          findOne: vi.fn((entityClass, _query) => {
            if (entityClass === RoleEntity) {
              return Promise.resolve({ id: 'role-student-uuid', code: 'student' });
            }
            return Promise.resolve(null);
          }),
        },
      })),
      query: vi.fn().mockResolvedValue([{ count: 0 }]),
    };

    service = new GuardiansService(
      mockUserRepo,
      mockRoleRepo,
      mockUserRoleRepo,
      mockStudentProfileRepo,
      mockLinkRepo,
      mockAuditService,
      mockDataSource,
      new GuardianProvisioningService(mockUserRepo, mockDataSource, mockAuditService),
    );
  });

  describe('Guardian Link Request & Policy-Dependent Consent', () => {
    it('should successfully create a pending link request when guardian agrees to policy v1.0-bd-minor-consent', async () => {
      mockUserRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.id === guardianUser.id) return Promise.resolve(guardianUser);
        if (where.id === studentUser.id) return Promise.resolve(studentUser);
        return Promise.resolve(null);
      });
      mockLinkRepo.findOne.mockResolvedValue(null);

      const result = await service.linkChildRequest(guardianUser.id, {
        studentIdentifier: studentUser.id,
        relationshipType: 'father',
        consentPolicyVersion: 'v1.0-bd-minor-consent',
        consentAgreed: true,
      });

      expect(result.status).toBe('pending');
      expect(result.relationshipType).toBe('father');
      expect(result.consentPolicyVersion).toBe('v1.0-bd-minor-consent');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'guardian.child.link_requested',
          actorUserId: guardianUser.id,
        }),
      );
    });

    it('NEGATIVE TEST: should reject link request if consent policy version is invalid', async () => {
      await expect(
        service.linkChildRequest(guardianUser.id, {
          studentIdentifier: studentUser.id,
          relationshipType: 'father',
          consentPolicyVersion: 'v0.9-draft',
          consentAgreed: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject link request if consent is not explicitly agreed', async () => {
      await expect(
        service.linkChildRequest(guardianUser.id, {
          studentIdentifier: studentUser.id,
          relationshipType: 'father',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject if guardian attempts to link themselves as a child learner', async () => {
      mockUserRepo.findOne.mockResolvedValue(guardianUser);

      await expect(
        service.linkChildRequest(guardianUser.id, {
          studentIdentifier: guardianUser.id,
          relationshipType: 'father',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject if an active relationship already exists', async () => {
      mockUserRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.id === guardianUser.id) return Promise.resolve(guardianUser);
        if (where.id === studentUser.id) return Promise.resolve(studentUser);
        return Promise.resolve(null);
      });
      mockLinkRepo.findOne.mockResolvedValue({
        id: 'existing-link-id',
        status: 'active',
      });

      await expect(
        service.linkChildRequest(guardianUser.id, {
          studentIdentifier: studentUser.id,
          relationshipType: 'mother',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Guardian Child Registration (Direct Onboarding)', () => {
    it('should register child learner account under guardian with active status and consent', async () => {
      mockUserRepo.findOne.mockResolvedValue(guardianUser);

      const result = await service.registerChild(guardianUser.id, {
        displayName: 'Subarna Hossain',
        dateOfBirth: '2012-05-15',
        institutionName: 'Viqarunnisa Noon School',
        relationshipType: 'mother',
        consentPolicyVersion: 'v1.0-bd-minor-consent',
        consentAgreed: true,
      });

      expect(result.status).toBe('active');
      expect(result.isMinor).toBe(true);
      expect(result.relationshipType).toBe('mother');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'guardian.child.registered',
          actorUserId: guardianUser.id,
        }),
      );
    });
  });

  describe('Multi-Child Management & Scoped Relationship Access', () => {
    it('should list multiple linked children for guardian', async () => {
      const links: GuardianStudentLinkEntity[] = [
        {
          id: 'link-1',
          guardianUserId: guardianUser.id,
          studentUserId: 'child-1-id',
          relationshipType: 'father',
          status: 'active',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentRecordedAt: new Date(),
          verifiedBy: guardianUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'link-2',
          guardianUserId: guardianUser.id,
          studentUserId: 'child-2-id',
          relationshipType: 'father',
          status: 'pending',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentRecordedAt: new Date(),
          verifiedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockLinkRepo.find.mockResolvedValue(links);
      mockUserRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'child-1-id')
          return Promise.resolve({ id: 'child-1-id', displayName: 'Child One' });
        if (where.id === 'child-2-id')
          return Promise.resolve({ id: 'child-2-id', displayName: 'Child Two' });
        return Promise.resolve(null);
      });
      mockStudentProfileRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.userId === 'child-1-id')
          return Promise.resolve({
            userId: 'child-1-id',
            dateOfBirth: '2011-01-01',
            institutionName: 'Dhaka Residential Model College',
          });
        return Promise.resolve(null);
      });

      const children = await service.getLinkedChildren(guardianUser.id);
      expect(children).toHaveLength(2);
      expect(children[0].displayName).toBe('Child One');
      expect(children[0].isMinor).toBe(true);
      expect(children[1].displayName).toBe('Child Two');
      expect(children[1].status).toBe('pending');
    });

    it('should return specific child details when active relationship exists', async () => {
      mockLinkRepo.findOne.mockResolvedValue({
        id: 'link-1',
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        relationshipType: 'father',
        status: 'active',
        consentPolicyVersion: 'v1.0-bd-minor-consent',
        consentRecordedAt: new Date(),
      });
      mockUserRepo.findOne.mockResolvedValue(studentUser);
      mockStudentProfileRepo.findOne.mockResolvedValue({
        userId: studentUser.id,
        dateOfBirth: '2010-09-20',
        institutionName: 'Notre Dame College',
      });

      const child = await service.getChildDetails(guardianUser.id, studentUser.id);
      expect(child.displayName).toBe(studentUser.displayName);
      expect(child.studentProfile?.institutionName).toBe('Notre Dame College');
    });

    it('NEGATIVE TEST / ABAC: should reject access to unrelated child not linked to guardian', async () => {
      mockLinkRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getChildDetails(guardianUser.id, 'unrelated-student-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Link Verification & Revocation Lifecycle', () => {
    it('should allow student to approve pending link request', async () => {
      const pendingLink = {
        id: 'link-pending-1',
        studentUserId: studentUser.id,
        guardianUserId: guardianUser.id,
        status: 'pending',
      };
      mockLinkRepo.findOne.mockResolvedValue(pendingLink);

      const result = await service.verifyLinkRequest(studentUser.id, 'link-pending-1', {
        decision: 'approve',
      });

      expect(result.status).toBe('active');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'guardian.child.link_approved',
          actorUserId: studentUser.id,
        }),
      );
    });

    it('should revoke active guardian link and emit audit trail', async () => {
      const activeLink = {
        id: 'link-active-1',
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      };
      mockLinkRepo.findOne.mockResolvedValue(activeLink);

      const result = await service.revokeLink(guardianUser.id, studentUser.id, {
        reason: 'Child transferred to independent study',
      });

      expect(result.success).toBe(true);
      expect(activeLink.status).toBe('revoked');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'guardian.child.link_revoked',
          actorUserId: guardianUser.id,
        }),
      );
    });

    it('NEGATIVE TEST / Safeguarding: should reject revoking link if student has active bookings in progress or dispute', async () => {
      const activeLink = {
        id: 'link-active-1',
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      };
      mockLinkRepo.findOne.mockResolvedValue(activeLink);
      mockDataSource.query.mockResolvedValue([{ count: 2 }]);

      await expect(
        service.revokeLink(guardianUser.id, studentUser.id, {
          reason: 'Child transferred to independent study',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
