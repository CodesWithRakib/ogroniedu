import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { AdminOperationsService } from './admin-operations.service';
import {
  SuspendUserDto,
  UpdateUserRolesDto,
  UpdateSystemSettingDto,
  UpdateFeatureFlagDto,
  StartImpersonationDto,
  QueryAuditLogsDto,
  AdminCancelBookingDto,
  AssignSupportCaseDto,
} from './dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminOperationsController {
  constructor(private readonly adminService: AdminOperationsService) {}

  /**
   * 1. Operational Dashboard Metrics
   */
  @Get('dashboard')
  @Roles('admin', 'super_admin')
  async getDashboard() {
    const data = await this.adminService.getOperationalDashboard();
    return {
      success: true,
      data,
    };
  }

  /**
   * 2. Users Management
   */
  @Get('users')
  @Roles('admin', 'super_admin')
  async listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.adminService.listUsers({ search, role, status, limit, offset });
    return {
      success: true,
      data: result.users,
      total: result.total,
    };
  }

  @Get('users/:id/dossier')
  @Roles('admin', 'super_admin')
  async getUserDossier(@Param('id', ParseUUIDPipe) userId: string) {
    const dossier = await this.adminService.getUserDossier(userId);
    return {
      success: true,
      data: dossier,
    };
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async suspendUser(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: SuspendUserDto,
  ) {
    const user = await this.adminService.suspendUser(adminUser, targetUserId, dto);
    return {
      success: true,
      message: `User ${user.displayName} (${user.id}) has been suspended.`,
      data: user,
    };
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async reactivateUser(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    const user = await this.adminService.reactivateUser(adminUser, targetUserId);
    return {
      success: true,
      message: `User ${user.displayName} (${user.id}) has been reactivated.`,
      data: user,
    };
  }

  @Put('users/:id/roles')
  @Roles('super_admin')
  async updateUserRoles(
    @CurrentUser() superAdmin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    const result = await this.adminService.updateUserRoles(superAdmin, targetUserId, dto);
    return {
      success: true,
      message: `Roles updated for user ${targetUserId}.`,
      data: result,
    };
  }

  /**
   * 3. Bookings Operations & Emergency Intervention
   */
  @Get('bookings')
  @Roles('admin', 'super_admin')
  async listBookings(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('tutorId') tutorId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.adminService.listAllBookings({ status, studentId, tutorId, limit, offset });
    return {
      success: true,
      data: result.bookings,
      total: result.total,
    };
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async adminCancelBooking(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Body() dto: AdminCancelBookingDto,
  ) {
    const result = await this.adminService.adminCancelBooking(adminUser, bookingId, dto);
    return {
      success: true,
      message: `Booking ${bookingId} cancelled by administrator.${result.refundIssued ? ' Refund processed.' : ''}`,
      data: result,
    };
  }

  /**
   * 4. Support Case Assignment
   */
  @Post('cases/assign')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async assignCase(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Body() dto: AssignSupportCaseDto,
  ) {
    const result = await this.adminService.assignCase(adminUser, dto);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * 5. Financial Reconciliation Visibility
   */
  @Get('reconciliation')
  @Roles('admin', 'super_admin')
  async getReconciliationOverview(@CurrentUser() adminUser: AuthenticatedUser) {
    const data = await this.adminService.getReconciliationOverview(adminUser);
    return {
      success: true,
      data,
    };
  }

  /**
   * 6. System Settings
   */
  @Get('settings')
  @Roles('admin', 'super_admin')
  async getSettings() {
    const data = await this.adminService.getSettings();
    return {
      success: true,
      data,
    };
  }

  @Put('settings/:key')
  @Roles('super_admin')
  async updateSetting(
    @CurrentUser() superAdmin: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateSystemSettingDto,
  ) {
    const setting = await this.adminService.updateSetting(superAdmin, key, dto);
    return {
      success: true,
      message: `System setting '${key}' updated successfully.`,
      data: setting,
    };
  }

  /**
   * 7. Feature Flags
   */
  @Get('feature-flags')
  @Roles('admin', 'super_admin')
  async getFeatureFlags() {
    const data = await this.adminService.getFeatureFlags();
    return {
      success: true,
      data,
    };
  }

  @Put('feature-flags/:key')
  @Roles('super_admin')
  async updateFeatureFlag(
    @CurrentUser() superAdmin: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    const flag = await this.adminService.updateFeatureFlag(superAdmin, key, dto);
    return {
      success: true,
      message: `Feature flag '${key}' updated successfully.`,
      data: flag,
    };
  }

  /**
   * 8. Impersonation Session Token (Strictly super_admin, max 15 minutes, fully audited)
   */
  @Post('impersonation/start')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin')
  async startImpersonation(
    @CurrentUser() superAdmin: AuthenticatedUser,
    @Body() dto: StartImpersonationDto,
  ) {
    const result = await this.adminService.startImpersonation(superAdmin, dto);
    return {
      success: true,
      message: `Impersonation session established for target user ${result.targetUser.displayName} (${result.targetUser.id}). Session expires in ${result.durationMinutes} minutes.`,
      data: result,
    };
  }

  /**
   * 9. Audit Logs Querying with Automated PII Redaction
   */
  @Get('audit-logs')
  @Roles('admin', 'super_admin')
  async queryAuditLogs(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Query() dto: QueryAuditLogsDto,
  ) {
    const result = await this.adminService.queryAuditLogs(adminUser, dto);
    return {
      success: true,
      data: result.logs,
      total: result.total,
    };
  }
}
