'use client';

import React from 'react';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
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
  useGetPendingTutorsQuery,
  useReviewTutorMutation,
  useVerifyTutorQualificationMutation,
  type TutorReviewDecision,
} from '@/store/services/admin-api';
import { useRunFinanceReconciliationMutation } from '@/store/services/payments-api';
import {
  EMPTY_METRICS,
  type AdminDashboardMetrics,
  type AdminReconciliationData,
  type AdminSystemSettingItem,
  type AdminFeatureFlagItem,
} from '../types/admin.types';
import { EMPTY_RECONCILIATION } from './use-admin-actions';
import {
  mapAdminBookings,
  mapAdminUsers,
  mapAuditLogs,
  mapPendingTutors,
  mapSupportTickets,
} from '../utils/admin-mappers';

/**
 * Admin dashboard data boundary: all queries + mutations + typed mapping in one hook.
 * Route/page components consume this instead of wiring 13 hooks inline.
 */
export function useAdminDashboard(locale: Locale) {
  const dashboard = useGetAdminDashboardQuery();
  const [userSearch, setUserSearch] = React.useState('');
  const [userStatus, setUserStatus] = React.useState<'all' | 'active' | 'suspended'>('all');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch.trim()), 400);
    return () => clearTimeout(timer);
  }, [userSearch]);
  const usersQuery = useListAdminUsersQuery({
    limit: 50,
    search: debouncedSearch || undefined,
    status: userStatus === 'all' ? undefined : userStatus,
  });
  const bookingsQuery = useListAdminBookingsQuery({ limit: 50 });
  const reconciliation = useGetAdminReconciliationQuery();
  const settings = useGetSystemSettingsQuery();
  const flags = useGetFeatureFlagsQuery();
  const auditLogs = useQueryAuditLogsQuery({ limit: 50 });
  const ticketsQuery = useListSupportTicketsQuery({ limit: 50 });
  const pendingTutorsQuery = useGetPendingTutorsQuery();
  const [suspendUser] = useSuspendUserMutation();
  const [reactivateUser] = useReactivateUserMutation();
  const [updateRoles] = useUpdateUserRolesMutation();
  const [cancelBooking] = useAdminCancelBookingMutation();
  const [updateFlag] = useUpdateFeatureFlagMutation();
  const [startImpersonation] = useStartImpersonationMutation();
  const [updateTicket] = useUpdateSupportTicketMutation();
  const [reviewTutor] = useReviewTutorMutation();
  const [verifyQualification] = useVerifyTutorQualificationMutation();
  const [runFinanceReconciliation] = useRunFinanceReconciliationMutation();

  const loading = dashboard.isLoading || usersQuery.isLoading || bookingsQuery.isLoading;
  const queryError = dashboard.isError
    ? normalizeApiError(dashboard.error, locale).message
    : usersQuery.isError
      ? normalizeApiError(usersQuery.error, locale).message
      : bookingsQuery.isError
        ? normalizeApiError(bookingsQuery.error, locale).message
        : null;

  const metrics = (dashboard.data?.data as AdminDashboardMetrics | undefined) ?? EMPTY_METRICS;
  // Mapped result sets must keep a stable identity between renders: consuming
  // pages sync local state from them in effects keyed on the array itself
  // (useAdminActions), and a fresh array each render would loop setState forever.
  const users = React.useMemo(
    () => mapAdminUsers((usersQuery.data?.data ?? []) as unknown[]),
    [usersQuery.data],
  );
  const bookings = React.useMemo(
    () => mapAdminBookings((bookingsQuery.data?.data ?? []) as unknown[]),
    [bookingsQuery.data],
  );
  const logs = React.useMemo(
    () => mapAuditLogs((auditLogs.data?.data ?? []) as unknown[]),
    [auditLogs.data],
  );
  const tickets = React.useMemo(
    () => mapSupportTickets((ticketsQuery.data?.data ?? []) as unknown[]),
    [ticketsQuery.data],
  );
  const pendingTutors = React.useMemo(
    () => mapPendingTutors((pendingTutorsQuery.data?.data ?? []) as unknown[]),
    [pendingTutorsQuery.data],
  );
  const settingsItems = React.useMemo(
    () => (settings.data?.data as AdminSystemSettingItem[] | undefined) ?? [],
    [settings.data],
  );
  const flagItems = React.useMemo(
    () => (flags.data?.data as AdminFeatureFlagItem[] | undefined) ?? [],
    [flags.data],
  );

  const wrap =
    <A extends unknown[]>(fn: (...a: A) => Promise<unknown>) =>
    async (...a: A): Promise<void> => {
      try {
        await fn(...a);
      } catch (err) {
        throw new Error(normalizeUnknownError(err, locale).message);
      }
    };

  return {
    metrics,
    users,
    userSearch,
    setUserSearch,
    userStatus,
    setUserStatus,
    bookings,
    logs,
    tickets,
    pendingTutors,
    pendingTutorsLoading: pendingTutorsQuery.isLoading,
    pendingTutorsError: pendingTutorsQuery.isError
      ? normalizeApiError(pendingTutorsQuery.error, locale).message
      : null,
    refetchPendingTutors: pendingTutorsQuery.refetch,
    reconciliation:
      (reconciliation.data?.data as AdminReconciliationData | undefined) ?? EMPTY_RECONCILIATION,
    settings: settingsItems,
    flags: flagItems,
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
    onUpdateTicketStatus: wrap(
      async (
        id: string,
        status: 'submitted' | 'in_review' | 'resolved' | 'spam',
        resolutionNotes?: string,
      ) => {
        await updateTicket({ id, status, resolutionNotes }).unwrap();
        ticketsQuery.refetch();
      },
    ),
    onReviewTutor: wrap(
      async (input: {
        tutorId: string;
        decision: TutorReviewDecision;
        reasonCode: string;
        internalNotes?: string;
      }) => {
        await reviewTutor(input).unwrap();
        pendingTutorsQuery.refetch();
      },
    ),
    onVerifyQualification: wrap(
      async (input: {
        tutorId: string;
        qualificationId: string;
        reviewStatus: 'approved' | 'rejected';
      }) => {
        await verifyQualification(input).unwrap();
        pendingTutorsQuery.refetch();
      },
    ),
    onRunReconciliation: wrap(async () => {
      await runFinanceReconciliation().unwrap();
      await reconciliation.refetch();
    }),
  };
}
