import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  AcceptInvitationDto,
  TransferOwnershipDto,
} from './dto';
import { ok } from '../../common/api-response/api-response';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgService: OrganizationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a new coaching center or tutoring organization' })
  @ApiResponse({ status: 201, description: 'Organization registered' })
  async createOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    const org = await this.orgService.createOrganization(user, dto);
    return ok(org, `Organization '${org.name}' registered and pending admin review.`);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations where caller is an active member' })
  @ApiResponse({ status: 200, description: 'List of user organizations' })
  async listMyOrganizations(@CurrentUser() user: AuthenticatedUser) {
    const orgs = await this.orgService.listMyOrganizations(user);
    return ok(orgs);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation to join an organization' })
  @ApiResponse({ status: 200, description: 'Invitation accepted and membership created' })
  async acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInvitationDto,
  ) {
    const result = await this.orgService.acceptInvitation(user, dto.token);
    return ok(result, `You have joined '${result.organization.name}' as ${result.member.role}.`);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an organization (tenant-scoped)' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async getOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const org = await this.orgService.getOrganizationById(user, id);
    return ok(org);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization profile (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Updated organization' })
  async updateOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const org = await this.orgService.updateOrganization(user, id, dto);
    return ok(org, 'Organization profile updated successfully.');
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members and affiliated tutors of an organization' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const members = await this.orgService.listMembers(user, id);
    return ok(members);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a staff member or tutor to join the organization' })
  @ApiResponse({ status: 201, description: 'Invitation created and dispatched' })
  async inviteMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
  ) {
    const invitation = await this.orgService.inviteMember(user, id, dto);
    return ok(invitation, `Invitation sent to ${invitation.email}.`);
  }

  @Delete(':id/members/:memberUserId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    const result = await this.orgService.removeMember(user, id, memberUserId);
    return ok(result);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer ownership of the organization to another active member' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  async transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    const org = await this.orgService.transferOwnership(user, id, dto);
    return ok(org, `Ownership of '${org.name}' successfully transferred.`);
  }
}
