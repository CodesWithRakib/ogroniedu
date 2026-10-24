import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminBookingsService } from './services/admin-bookings.service';
import { AdminPlatformService } from './services/admin-platform.service';
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
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export { redactSensitiveData } from './utils/redact.util';

/**
 * Backward-compatible facade over the split admin domain services.
 * Controllers and other modules keep importing AdminOperationsService; new code
 * should inject AdminDashboardService / AdminUsersService / AdminBookingsService /
 * AdminPlatformService directly.
 */
@Injectable()
export class AdminOperationsService {
  constructor(
    @Inject(forwardRef(() => AdminDashboardService))
    private readonly dashboard: AdminDashboardService,
    @Inject(forwardRef(() => AdminUsersService))
    private readonly users: AdminUsersService,
    @Inject(forwardRef(() => AdminBookingsService))
    private readonly bookings: AdminBookingsService,
    @Inject(forwardRef(() => AdminPlatformService))
    private readonly platform: AdminPlatformService,
  ) {}

  getOperationalDashboard() {
    return this.dashboard.getOperationalDashboard();
  }
  listUsers(query: Parameters<AdminUsersService['listUsers']>[0]) {
    return this.users.listUsers(query);
  }
  getUserDossier(userId: string) {
    return this.users.getUserDossier(userId);
  }
  suspendUser(adminUser: AuthenticatedUser, targetUserId: string, dto: SuspendUserDto) {
    return this.users.suspendUser(adminUser, targetUserId, dto);
  }
  banUser(adminUser: AuthenticatedUser, targetUserId: string, dto: { reason: string }) {
    return this.users.banUser(adminUser, targetUserId, dto);
  }
  getUserSafetyStrikes(userId: string) {
    return this.users.getUserSafetyStrikes(userId);
  }
  reactivateUser(adminUser: AuthenticatedUser, targetUserId: string) {
    return this.users.reactivateUser(adminUser, targetUserId);
  }
  updateUserRoles(superAdmin: AuthenticatedUser, targetUserId: string, dto: UpdateUserRolesDto) {
    return this.users.updateUserRoles(superAdmin, targetUserId, dto);
  }
  listAllBookings(query: Parameters<AdminBookingsService['listAllBookings']>[0]) {
    return this.bookings.listAllBookings(query);
  }
  getBookingDetail(bookingId: string) {
    return this.bookings.getBookingDetail(bookingId);
  }
  adminCancelBooking(adminUser: AuthenticatedUser, bookingId: string, dto: AdminCancelBookingDto) {
    return this.bookings.adminCancelBooking(adminUser, bookingId, dto);
  }
  assignCase(adminUser: AuthenticatedUser, dto: AssignSupportCaseDto) {
    return this.bookings.assignCase(adminUser, dto);
  }
  getReconciliationOverview(adminUser: AuthenticatedUser) {
    return this.platform.getReconciliationOverview(adminUser);
  }
  getSettings() {
    return this.platform.getSettings();
  }
  updateSetting(superAdmin: AuthenticatedUser, key: string, dto: UpdateSystemSettingDto) {
    return this.platform.updateSetting(superAdmin, key, dto);
  }
  getFeatureFlags() {
    return this.platform.getFeatureFlags();
  }
  updateFeatureFlag(superAdmin: AuthenticatedUser, key: string, dto: UpdateFeatureFlagDto) {
    return this.platform.updateFeatureFlag(superAdmin, key, dto);
  }
  startImpersonation(superAdmin: AuthenticatedUser, dto: StartImpersonationDto) {
    return this.platform.startImpersonation(superAdmin, dto);
  }
  queryAuditLogs(adminUser: AuthenticatedUser, dto: QueryAuditLogsDto) {
    return this.platform.queryAuditLogs(adminUser, dto);
  }
}
