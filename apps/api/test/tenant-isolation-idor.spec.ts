import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Tenant Isolation & IDOR Defense Tests (Phase 09)', () => {
  let service: OrganizationsService;
  let mockOrgRepo: any;
  let mockMemberRepo: any;
  let mockInvitationRepo: any;
  let mockUserRepo: any;
  let mockDataSource: any;
  let mockAuditService: any;

  const orgAId = 'aaaaaaaa-0000-4000-8000-000000000001';
  const orgBId = 'bbbbbbbb-0000-4000-8000-000000000002';
  const ownerAId = '11111111-0000-4000-8000-000000000001';
  const ownerBId = '22222222-0000-4000-8000-000000000002';

  const userOrgA: AuthenticatedUser = {
    id: ownerAId,
    email: 'owner@org-a.com',
    roles: ['organization_owner'],
  };

  const userOrgB: AuthenticatedUser = {
    id: ownerBId,
    email: 'owner@org-b.com',
    roles: ['organization_owner'],
  };

  const orgA: any = {
    id: orgAId,
    name: 'Coaching Center Alpha',
    slug: 'coaching-alpha',
    ownerUserId: ownerAId,
    status: 'active',
  };

  const orgB: any = {
    id: orgBId,
    name: 'Coaching Center Beta (Competitor)',
    slug: 'coaching-beta',
    ownerUserId: ownerBId,
    status: 'active',
  };

  beforeEach(() => {
    mockOrgRepo = {
      findOne: vi.fn(async ({ where }: any) => {
        if (where?.id === orgAId) return orgA;
        if (where?.id === orgBId) return orgB;
        return null;
      }),
    };

    mockMemberRepo = {
      findOne: vi.fn(async ({ where }: any) => {
        // User A is member of Org A only
        if (where?.organizationId === orgAId && where?.userId === ownerAId) {
          return { organizationId: orgAId, userId: ownerAId, role: 'owner', status: 'active' };
        }
        // User B is member of Org B only
        if (where?.organizationId === orgBId && where?.userId === ownerBId) {
          return { organizationId: orgBId, userId: ownerBId, role: 'owner', status: 'active' };
        }
        return null; // Not a member!
      }),
      find: vi.fn(),
      count: vi.fn().mockResolvedValue(5),
    };

    mockInvitationRepo = {};
    mockUserRepo = {};
    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    mockDataSource = {};

    service = new OrganizationsService(
      mockOrgRepo,
      mockMemberRepo,
      mockInvitationRepo,
      mockUserRepo,
      mockDataSource,
      mockAuditService,
    );
  });

  describe('Cross-Tenant Data Exposure (IDOR)', () => {
    it('User A CAN access own Organization A details', async () => {
      const result = await service.getOrganizationById(userOrgA, orgAId);
      expect(result.id).toBe(orgAId);
      expect(result.name).toBe('Coaching Center Alpha');
    });

    it('User B CAN access own Organization B details', async () => {
      const result = await service.getOrganizationById(userOrgB, orgBId);
      expect(result.id).toBe(orgBId);
      expect(result.name).toBe('Coaching Center Beta (Competitor)');
    });

    it('NEGATIVE TEST: User A CANNOT read competitor Organization B details (IDOR blocked)', async () => {
      await expect(service.getOrganizationById(userOrgA, orgBId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('NEGATIVE TEST: User A CANNOT list members of competitor Organization B', async () => {
      await expect(service.listMembers(userOrgA, orgBId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('NEGATIVE TEST: User A CANNOT update competitor Organization B profile', async () => {
      await expect(
        service.updateOrganization(userOrgA, orgBId, { name: 'Hacked Alpha' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE TEST: User A CANNOT invite users into competitor Organization B', async () => {
      await expect(
        service.inviteMember(userOrgA, orgBId, { email: 'trojan@hack.com', role: 'admin' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
