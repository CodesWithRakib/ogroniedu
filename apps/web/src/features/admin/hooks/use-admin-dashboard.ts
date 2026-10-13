'use client';

import { normalizeApiError } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import {
  useGetAdminDashboardQuery,
  useListAdminUsersQuery,
  useListAdminBookingsQuery,
  useSuspendUserMutation,
  useReactivateUserMutation,
  useUpdateUserRolesMutation,
  useAdminCancelBookingMutation,
  useGetAdminReconciliationQuery,
  useGetSystemSettingsQuery,
  useGetFeatureFlagsQuery,
  useUpdateFeatureFlagMutation,
  useStartImpersonationMutation,
  useQueryAuditLogsQuery,
  useListSupportTicketsQuery,
  useUpdateSupportTicketMutation,
} from '@/store/services/admin-api';
import { EMPTY_METRICS, type AdminDashboardMetrics } from '../types/admin.types';
import { mapAdminBookings, mapAdminUsers, mapAuditLogs, mapSupportTickets } from '../utils/admin-mappers';

/**
 * Admin dashboard data boundary: all queries + mutations + typed mapping in one hook.
 * Route/page components consume this instead of wiring 13 hooks inline.
 */
export function useAdminDashboard(locale: Locale) {
  const dashboard = useGetAdminDashboardQuery();
  const usersQuery = useListAdminUsersQuery({ limit: 50 });
  const bookingsQuery = useListAdminBookingsQuery({ limit: 50 });
  const reconciliation = useGetAdminReconciliationQuery();
  const settings = useGetSystemSettingsQuery();
  const flags = useGetFeatureFlagsQuery();
  const auditLogs = useQueryAuditLogsQuery({ limit: 50 });
  const ticketsQuery = useListSupportTicketsQuery({ limit: 50 });
  const [suspendUser] = useSuspendUserMutation();
  const [reactivateUser] = useReactivateUserMutation();
  const [updateRoles] = useUpdateUserRolesMutation();
  const [cancelBooking] = useAdminCancelBookingMutation();
  const [updateFlag] = useUpdateFeatureFlagMutation();
  const [startImpersonation] = useStartImpersonationMutation();
  const [updateTicket] = useUpdateSupportTicketMutation();

  const loading = dashboard.isLoading || usersQuery.isLoading || bookingsQuery.isLoading;
  const queryError = dashboard.isError
    ? normalizeApiError(dashboard.error, locale).message
    : usersQuery.isError
      ? normalizeApiError(usersQuery.error, locale).message
      : bookingsQuery.isError
        ? normalizeApiError(bookingsQuery.error, locale).message
        : null;

  const metrics = (dashboard.data?.data as AdminDashboardMetrics | undefined) ?? EMPTY_METRICS;
  const users = mapAdminUsers((usersQuery.data?.data ?? []) as unknown[]);
  const bookings = mapAdminBookings((bookingsQuery.data?.data ?? []) as unknown[]);
  const logs = mapAuditLogs((auditLogs.data?.data ?? []) as unknown[]);
  const tickets = mapSupportTickets((ticketsQuery.data?.data ?? []) as unknown[]);

  const wrap =
    <A extends unknown[]>(fn: (...a: A) => Promise<unknown>) =>
    async (...a: A): Promise<void> => {
      try {
        await fn(...a);
      } catch (err) {
        throw new Error(normalizeApiError(err as never, locale).message);
      }
    };

  return {
    metrics,
    users,
    bookings,
    logs,
    tickets,
    reconciliation: reconciliation.data?.data,
    settings: (settings.data?.data as unknown[] | undefined) ?? [],
    flags: (flags.data?.data as unknown[] | undefined) ?? [],
    loading,
    queryError,
    secondaryError: reconciliation.isError || settings.isError || flags.isError,
    onSuspendUser: wrap(async (userId: string, reason: string) => {
      await suspendUser({ id: userId, reason }).unwrap();
      usersQuery.refetch();
    }),
    onReactivateUser: wrap(async (userId: string) => {
      await reactivateUser(userId).unwrap();
      usersQuery.refetch();
    }),
    onUpdateRoles: wrap(async (userId: string, roles: string[]) => {
      await updateRoles({ id: userId, roles }).unwrap();
      usersQuery.refetch();
    }),
    onCancelBooking: wrap(async (bookingId: string, reason: string, refundStudent: boolean) => {
      await cancelBooking({ id: bookingId, reason, refundStudent }).unwrap();
      bookingsQuery.refetch();
    }),
    onStartImpersonation: wrap(
      async (targetUserId: string, reason: string, durationMinutes: number) => {
        await startImpersonation({ targetUserId, reason, durationMinutes }).unwrap();
      },
    ),
    onUpdateFeatureFlag: wrap(async (key: string, enabled: boolean) => {
      await updateFlag({ key, enabled }).unwrap();
      flags.refetch();
    }),
    onUpdateTicketStatus: wrap(async (id: string, status: 'submitted' | 'in_review' | 'resolved' | 'spam', resolutionNotes?: string) => {
      await updateTicket({ id, status, resolutionNotes }).unwrap();
      ticketsQuery.refetch();
    }),
  };
}
