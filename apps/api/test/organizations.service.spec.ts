import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('OrganizationsService & Tenant Isolation (Phase 09)', () => {
  let service: OrganizationsService;
  let mockOrgRepo: any;
  let mockMemberRepo: any;
  let mockInvitationRepo: any;
  let mockUserRepo: any;
  let mockDataSource: any;
  let mockAuditService: any;

  const orgId = '00000000-0000-4000-8000-000000000001';
  const ownerUserId = '00000000-0000-4000-8000-000000000002';
  const strangerUserId = '00000000-0000-4000-8000-000000000099';
  const adminUserId = '00000000-0000-4000-8000-000000000088';

  const ownerUser: AuthenticatedUser = {
    id: ownerUserId,
    email: 'owner@uccbd.org',
    roles: ['organization_owner'],
  };

  const strangerUser: AuthenticatedUser = {
    id: strangerUserId,
    email: 'stranger@example.com',
    roles: ['student'],
  };

  const platformAdminUser: AuthenticatedUser = {
    id: adminUserId,
    email: 'admin@ogroniedu.com',
    roles: ['admin'],
  };

  const sampleOrg: any = {
    id: orgId,
    name: 'UCC College Admission Care',
    slug: 'ucc-college-admission',
    type: 'coaching_center',
    status: 'active',
    ownerUserId: ownerUserId,
    contactEmail: 'info@uccbd.org',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockOrgRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data) => ({ ...data, id: orgId })),
      save: vi.fn((entity) => Promise.resolve(entity)),
      count: vi.fn().mockResolvedValue(1),
      createQueryBuilder: vi.fn(),
    };

    mockMemberRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((data) => ({ ...data, id: 'member-1' })),
      save: vi.fn((entity) => Promise.resolve(entity)),
      count: vi.fn().mockResolvedValue(2),
    };

    mockInvitationRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ ...data, id: 'invite-1' })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockUserRepo = {
      findOne: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockDataSource = {
      transaction: vi.fn(async (cb: any) => {
        const manager = {
          create: vi.fn((_cls: any, data: any) => ({ ...data, id: orgId })),
          save: vi.fn((entity: any) => Promise.resolve(entity)),
          findOne: vi.fn(),
        };
        return cb(manager);
      }),
    };

    service = new OrganizationsService(
      mockOrgRepo,
      mockMemberRepo,
      mockInvitationRepo,
      mockUserRepo,
      mockDataSource,
      mockAuditService,
    );
  });

  describe('1. Organization Creation & Slug Uniqueness', () => {
    it('should successfully create organization and assign caller as owner', async () => {
      mockOrgRepo.findOne.mockResolvedValue(null);

      const result = await service.createOrganization(ownerUser, {
        name: 'Retina Medical Coaching',
        slug: 'retina-medical',
        contactEmail: 'retina@example.com',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Retina Medical Coaching');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'organization.registered',
          actorUserId: ownerUserId,
        }),
      );
    });

    it('NEGATIVE TEST: should reject duplicate slug with 409 Conflict', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);

      await expect(
        service.createOrganization(ownerUser, {
          name: 'Another UCC',
          slug: 'ucc-college-admission',
          contactEmail: 'other@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Tenant Isolation & Membership Verification (IDOR Defense)', () => {
    it('should grant access to organization details for active member', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);
      mockMemberRepo.findOne.mockResolvedValue({
        organizationId: orgId,
        userId: ownerUserId,
        role: 'owner',
        status: 'active',
      });

      const res = await service.getOrganizationById(ownerUser, orgId);
      expect(res.name).toBe(sampleOrg.name);
      expect(res.memberCount).toBe(2);
    });

    it('NEGATIVE TEST: should deny non-member access to organization details with 403 Forbidden', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);
      mockMemberRepo.findOne.mockResolvedValue(null); // Not a member!

      await expect(service.getOrganizationById(strangerUser, orgId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow platform admin to inspect any organization regardless of membership', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);

      const res = await service.getOrganizationById(platformAdminUser, orgId);
      expect(res.name).toBe(sampleOrg.name);
      expect(mockMemberRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('3. Member Management & Invitations', () => {
    it('should allow owner to issue an invitation token', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);
      mockMemberRepo.findOne.mockResolvedValue({
        organizationId: orgId,
        userId: ownerUserId,
        role: 'owner',
        status: 'active',
      });

      const invite = await service.inviteMember(ownerUser, orgId, {
        email: 'newtutor@example.com',
        role: 'tutor',
      });

      expect(invite).toBeDefined();
      expect(invite.email).toBe('newtutor@example.com');
      expect(invite.token).toBeDefined();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.member_invited' }),
      );
    });

    it('NEGATIVE TEST: should reject invitation redemption if token expired', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({
        token: 'expired-token',
        status: 'pending',
        expiresAt: new Date(Date.now() - 10000), // Expired!
      });

      await expect(service.acceptInvitation(strangerUser, 'expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('NEGATIVE TEST: should prevent removing the primary owner without transfer', async () => {
      mockOrgRepo.findOne.mockResolvedValue(sampleOrg);

      await expect(service.removeMember(ownerUser, orgId, ownerUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('4. Platform Admin Governance (Approve / Suspend)', () => {
    it('should allow platform admin to approve organization and record audit event', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ ...sampleOrg, status: 'pending_approval' });

      const updated = await service.adminUpdateStatus(platformAdminUser, orgId, {
        status: 'active',
        reason: 'Trade license verified with municipal authority.',
      });

      expect(updated.status).toBe('active');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.organization.active',
          actorUserId: adminUserId,
          reason: 'Trade license verified with municipal authority.',
        }),
      );
    });

    it('should allow platform admin to suspend organization and record audit event', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ ...sampleOrg, status: 'active' });

      const updated = await service.adminUpdateStatus(platformAdminUser, orgId, {
        status: 'suspended',
        reason: 'Safety compliance violation under investigation.',
      });

      expect(updated.status).toBe('suspended');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.organization.suspended',
          actorUserId: adminUserId,
        }),
      );
    });
  });
});
