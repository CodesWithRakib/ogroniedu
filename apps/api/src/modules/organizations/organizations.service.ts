import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  OrganizationEntity,
  OrganizationMemberEntity,
  OrganizationInvitationEntity,
} from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateOrganizationStatusDto,
  TransferOwnershipDto,
  QueryOrganizationsDto,
} from './dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepo: Repository<OrganizationMemberEntity>,
    @InjectRepository(OrganizationInvitationEntity)
    private readonly invitationRepo: Repository<OrganizationInvitationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper: Verify user has active membership in the organization with permitted roles
   */
  async verifyMembership(
    userId: string,
    organizationId: string,
    allowedRoles?: string[],
  ): Promise<OrganizationMemberEntity> {
    const member = await this.memberRepo.findOne({
      where: { organizationId, userId, status: 'active' },
      relations: { organization: true },
    });

    if (!member) {
      throw new ForbiddenException(
        'Access denied: You are not an active member of this organization',
      );
    }

    if (allowedRoles && !allowedRoles.includes(member.role)) {
      throw new ForbiddenException(
        `Access denied: Operation requires one of the following roles: [${allowedRoles.join(', ')}]`,
      );
    }

    return member;
  }

  /**
   * 1. Register a new Organization (Caller becomes the initial Owner)
   */
  async createOrganization(
    user: AuthenticatedUser,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const existingSlug = await this.orgRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException(`An organization with slug '${dto.slug}' already exists`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const org = manager.create(OrganizationEntity, {
        name: dto.name,
        slug: dto.slug,
        type: dto.type ?? 'coaching_center',
        status: 'pending_approval',
        ownerUserId: user.id,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone ?? null,
        tradeLicenseNumber: dto.tradeLicenseNumber ?? null,
        address: dto.address ?? null,
        division: dto.division ?? null,
        district: dto.district ?? null,
        settings: dto.settings ?? {},
      });

      const savedOrg = await manager.save(org);

      const ownerMember = manager.create(OrganizationMemberEntity, {
        organizationId: savedOrg.id,
        userId: user.id,
        role: 'owner',
        status: 'active',
      });
      await manager.save(ownerMember);

      await this.auditService.record({
        actorUserId: user.id,
        action: 'organization.registered',
        resourceType: 'organizations',
        resourceId: savedOrg.id,
        organizationId: savedOrg.id,
        safeMetadata: { name: savedOrg.name, slug: savedOrg.slug },
      });

      this.logger.log(`Organization created: ${savedOrg.name} (${savedOrg.id}) by user ${user.id}`);
      return savedOrg;
    });
  }

  /**
   * 2. List organizations where the calling user is an active member
   */
  async listMyOrganizations(
    user: AuthenticatedUser,
  ): Promise<Array<OrganizationEntity & { memberRole: string }>> {
    const members = await this.memberRepo.find({
      where: { userId: user.id, status: 'active' },
      relations: { organization: true },
      order: { joinedAt: 'DESC' },
    });

    return members
      .filter((m) => m.organization !== undefined)
      .map((m) => ({
        ...m.organization!,
        memberRole: m.role,
      }));
  }

  /**
   * 3. Get Organization details (tenant-isolated)
   */
  async getOrganizationById(
    user: AuthenticatedUser,
    orgId: string,
  ): Promise<OrganizationEntity & { memberCount: number }> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (!isAdminRole(user)) {
      await this.verifyMembership(user.id, orgId);
    }

    const memberCount = await this.memberRepo.count({
      where: { organizationId: orgId, status: 'active' },
    });

    return {
      ...org,
      memberCount,
    };
  }

  /**
   * 4. Update Organization metadata
   */
  async updateOrganization(
    user: AuthenticatedUser,
    orgId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (!isAdminRole(user)) {
      await this.verifyMembership(user.id, orgId, ['owner', 'admin']);
    }

    if (dto.name !== undefined) org.name = dto.name;
    if (dto.type !== undefined) org.type = dto.type;
    if (dto.contactEmail !== undefined) org.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) org.contactPhone = dto.contactPhone;
    if (dto.tradeLicenseNumber !== undefined) org.tradeLicenseNumber = dto.tradeLicenseNumber;
    if (dto.address !== undefined) org.address = dto.address;
    if (dto.division !== undefined) org.division = dto.division;
    if (dto.district !== undefined) org.district = dto.district;
    if (dto.settings !== undefined) org.settings = { ...org.settings, ...dto.settings };

    const saved = await this.orgRepo.save(org);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'organization.updated',
      resourceType: 'organizations',
      resourceId: orgId,
      organizationId: orgId,
      safeMetadata: { updatedFields: Object.keys(dto) },
    });

    return saved;
  }

  /**
   * 5. List Organization Members
   */
  async listMembers(user: AuthenticatedUser, orgId: string): Promise<OrganizationMemberEntity[]> {
    if (!isAdminRole(user)) {
      await this.verifyMembership(user.id, orgId);
    }

    return await this.memberRepo.find({
      where: { organizationId: orgId, status: 'active' },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * 6. Invite Member (Staff or Tutor)
   */
  async inviteMember(
    user: AuthenticatedUser,
    orgId: string,
    dto: InviteMemberDto,
  ): Promise<OrganizationInvitationEntity> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (!isAdminRole(user)) {
      await this.verifyMembership(user.id, orgId, ['owner', 'admin']);
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = this.invitationRepo.create({
      organizationId: orgId,
      email: dto.email.toLowerCase().trim(),
      role: dto.role,
      invitedByUserId: user.id,
      token,
      status: 'pending',
      expiresAt,
    });

    const saved = await this.invitationRepo.save(invitation);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'organization.member_invited',
      resourceType: 'organizations',
      resourceId: orgId,
      organizationId: orgId,
      safeMetadata: { inviteeEmail: dto.email, role: dto.role },
    });

    return saved;
  }

  /**
   * 7. Accept Member Invitation
   */
  async acceptInvitation(
    user: AuthenticatedUser,
    token: string,
  ): Promise<{ organization: OrganizationEntity; member: OrganizationMemberEntity }> {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired or has already been used');
    }

    return await this.dataSource.transaction(async (manager) => {
      let member = await manager.findOne(OrganizationMemberEntity, {
        where: { organizationId: invitation.organizationId, userId: user.id },
      });

      if (member) {
        member.role = invitation.role;
        member.status = 'active';
      } else {
        member = manager.create(OrganizationMemberEntity, {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          status: 'active',
          invitedBy: invitation.invitedByUserId,
        });
      }

      const savedMember = await manager.save(member);

      invitation.status = 'accepted';
      await manager.save(invitation);

      await this.auditService.record({
        actorUserId: user.id,
        action: 'organization.invitation_accepted',
        resourceType: 'organizations',
        resourceId: invitation.organizationId,
        organizationId: invitation.organizationId,
        safeMetadata: { role: invitation.role },
      });

      return {
        organization: invitation.organization!,
        member: savedMember,
      };
    });
  }

  /**
   * 8. Remove Member
   */
  async removeMember(
    user: AuthenticatedUser,
    orgId: string,
    memberUserId: string,
  ): Promise<{ message: string }> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (org.ownerUserId === memberUserId) {
      throw new BadRequestException(
        'Cannot remove the primary organization owner. Transfer ownership first.',
      );
    }

    if (!isAdminRole(user)) {
      await this.verifyMembership(user.id, orgId, ['owner', 'admin']);
    }

    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: memberUserId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    member.status = 'left';
    await this.memberRepo.save(member);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'organization.member_removed',
      resourceType: 'organizations',
      resourceId: orgId,
      organizationId: orgId,
      safeMetadata: { removedUserId: memberUserId },
    });

    return { message: `Member ${memberUserId} removed from organization` };
  }

  /**
   * 9. Transfer Ownership (Owner only)
   */
  async transferOwnership(
    user: AuthenticatedUser,
    orgId: string,
    dto: TransferOwnershipDto,
  ): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (org.ownerUserId !== user.id && !isAdminRole(user)) {
      throw new ForbiddenException('Only the current organization owner can transfer ownership');
    }

    const newOwnerMember = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: dto.newOwnerUserId, status: 'active' },
    });
    if (!newOwnerMember) {
      throw new BadRequestException(
        'New owner must already be an active member of the organization',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Demote old owner to admin
      const oldOwnerMember = await manager.findOne(OrganizationMemberEntity, {
        where: { organizationId: orgId, userId: org.ownerUserId },
      });
      if (oldOwnerMember) {
        oldOwnerMember.role = 'admin';
        await manager.save(oldOwnerMember);
      }

      // Promote new owner
      newOwnerMember.role = 'owner';
      await manager.save(newOwnerMember);

      const previousOwnerId = org.ownerUserId;
      org.ownerUserId = dto.newOwnerUserId;
      const savedOrg = await manager.save(org);

      await this.auditService.record({
        actorUserId: user.id,
        action: 'admin.organization.ownership_transferred',
        resourceType: 'organizations',
        resourceId: orgId,
        organizationId: orgId,
        reason: dto.reason,
        safeMetadata: { previousOwnerId, newOwnerId: dto.newOwnerUserId },
      });

      return savedOrg;
    });
  }

  /**
   * 10. Platform Admin: List all organizations
   */
  async adminListAllOrganizations(
    query: QueryOrganizationsDto,
  ): Promise<{ organizations: OrganizationEntity[]; total: number }> {
    const qb = this.orgRepo.createQueryBuilder('org').orderBy('org.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        '(org.name ILIKE :search OR org.slug ILIKE :search OR org.contactEmail ILIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    if (query.type) {
      qb.andWhere('org.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('org.status = :status', { status: query.status });
    }

    qb.skip(query.offset).take(query.limit);

    const [organizations, total] = await qb.getManyAndCount();
    return { organizations, total };
  }

  /**
   * 11. Platform Admin: Update organization status (approve / suspend / archive)
   */
  async adminUpdateStatus(
    admin: AuthenticatedUser,
    orgId: string,
    dto: UpdateOrganizationStatusDto,
  ): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    const previousStatus = org.status;
    org.status = dto.status;
    const saved = await this.orgRepo.save(org);

    await this.auditService.record({
      actorUserId: admin.id,
      action: `admin.organization.${dto.status}`,
      resourceType: 'organizations',
      resourceId: orgId,
      organizationId: orgId,
      reason: dto.reason,
      safeMetadata: { previousStatus, newStatus: dto.status },
    });

    this.logger.log(
      `Organization ${orgId} status changed from ${previousStatus} to ${dto.status} by admin ${admin.id}`,
    );
    return saved;
  }
}
