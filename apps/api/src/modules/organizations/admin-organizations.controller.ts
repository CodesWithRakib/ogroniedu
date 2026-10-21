import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { QueryOrganizationsDto, UpdateOrganizationStatusDto } from './dto';
import { ok, paginated } from '../../common/api-response/api-response';
import { fromOffsetLimit } from '../../common/pagination/pagination.dto';

@ApiTags('Admin Organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('api/v1/admin/organizations')
export class AdminOrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgService: OrganizationsService,
  ) {}

  @Get()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Platform admin list of all organizations' })
  @ApiResponse({ status: 200, description: 'Paginated list of organizations' })
  async listOrganizations(@Query() query: QueryOrganizationsDto) {
    const result = await this.orgService.adminListAllOrganizations(query);
    const { page, pageSize } = fromOffsetLimit({ offset: query.offset, limit: query.limit });
    return paginated(result.organizations, { page, pageSize, totalItems: result.total });
  }

  @Patch(':id/status')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Approve, suspend, or archive an organization' })
  @ApiResponse({ status: 200, description: 'Updated organization status' })
  async updateStatus(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    const org = await this.orgService.adminUpdateStatus(adminUser, id, dto);
    return ok(org, `Organization '${org.name}' status updated to '${org.status}'.`);
  }
}
