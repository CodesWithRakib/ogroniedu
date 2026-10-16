'use client';

import React from 'react';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetUnreadCountQuery } from '@/store/services/notifications-api';
import { useGetMyProfileQuery } from '@/store/services/users-api';
import { useGetStudentLearningSummaryQuery } from '@/store/services/learning-api';
import { useGetMyGuardiansQuery } from '@/store/services/guardians-api';
import { mapSessionItems } from '@/features/bookings/utils/session-mappers';
import type { CalendarSessionItem } from '@/features/bookings/types/session.types';
import type { Locale } from '@/lib/i18n';

export interface ActiveTutorInfo {
  tutorUserId: string;
  displayName: string;
  subjectName: string;
  hourlyRateMinor: string | number | null;
  bookingId: string;
  mode: string;
  status: string;
}

/** Feature-level student hook: aggregated queries, learning metrics, active tutors, and academic profile. */
export function useStudentDashboard(locale: Locale = 'bn') {
  const user = useAppSelector((s) => s.auth.user);
  const profileQuery = useGetMyProfileQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const unread = useGetUnreadCountQuery();
  const learningSummary = useGetStudentLearningSummaryQuery(user?.id ?? '', {
    skip: !user?.id,
  });
  const guardiansQuery = useGetMyGuardiansQuery(undefined, {
    skip: !user?.id,
  });

  const myRequests = React.useMemo(() => requests.data?.data ?? [], [requests.data]);
  const rawSessions = React.useMemo(() => sessions.data?.data ?? [], [sessions.data]);

  const mappedSessions = React.useMemo<CalendarSessionItem[]>(
    () => mapSessionItems(rawSessions, locale),
    [rawSessions, locale],
  );

  const upcomingSessions = React.useMemo<CalendarSessionItem[]>(() => {
    return mappedSessions
      .filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [mappedSessions]);

  const nextSession = upcomingSessions[0] ?? null;

  // Extract unique active tutors from accepted / active bookings
  const activeTutors = React.useMemo<ActiveTutorInfo[]>(() => {
    const list: ActiveTutorInfo[] = [];
    const seen = new Set<string>();

    for (const req of myRequests) {
      const tutorId = String(req.tutorUserId ?? req.tutorId ?? '');
      if (!tutorId || seen.has(tutorId)) continue;

      // Only count active or accepted bookings for active tutors
      const isAccepted = ['accepted', 'confirmed', 'in_progress', 'awaiting_payment'].includes(
        String(req.status),
      );
      if (!isAccepted) continue;

      seen.add(tutorId);

      const tp = req.tutorProfile && typeof req.tutorProfile === 'object' ? req.tutorProfile : null;
      const tu = tp && 'user' in tp && typeof tp.user === 'object' ? tp.user : null;
      const displayName =
        (tu && 'displayName' in tu && typeof tu.displayName === 'string' ? tu.displayName : null) ??
        (req.tutorName && typeof req.tutorName === 'string' ? req.tutorName : null) ??
        'সম্মানিত শিক্ষক';

      const subj = req.subject && typeof req.subject === 'object' ? req.subject : null;
      const subjectName =
        (subj && 'nameBn' in subj && locale === 'bn' && typeof subj.nameBn === 'string'
          ? subj.nameBn
          : subj && 'nameEn' in subj && typeof subj.nameEn === 'string'
            ? subj.nameEn
            : null) ??
        (req.subjectName && typeof req.subjectName === 'string' ? req.subjectName : null) ??
        (locale === 'bn' ? 'সাধারণ পাঠ্যক্রম' : 'General Tutoring');

      const rateMinor: string | number | null =
        typeof req.pricePerSessionMinor === 'string' || typeof req.pricePerSessionMinor === 'number'
          ? req.pricePerSessionMinor
          : tp && 'hourlyRateMinor' in tp && (typeof tp.hourlyRateMinor === 'string' || typeof tp.hourlyRateMinor === 'number')
            ? tp.hourlyRateMinor
            : null;

      list.push({
        tutorUserId: tutorId,
        displayName,
        subjectName,
        hourlyRateMinor: rateMinor,
        bookingId: String(req.id),
        mode: String(req.mode ?? 'online'),
        status: String(req.status),
      });
    }

    return list;
  }, [myRequests, locale]);

  // Learning summary data
  const summaryData = learningSummary.data?.data;
  const metrics = summaryData?.metrics ?? null;
  const assignments = summaryData?.assignments ?? [];
  const submissions = summaryData?.submissions ?? [];
  const progressReports = summaryData?.progressReports ?? [];

  const pendingAssignments = React.useMemo(() => {
    return assignments.filter((asgn) => {
      const sub = asgn.submission;
      return !sub || sub.status === 'assigned';
    });
  }, [assignments]);

  const studentProfile = profileQuery.data?.studentProfile ?? null;
  const isMinor = Boolean(profileQuery.data?.isMinor);
  const myGuardians = guardiansQuery.data ?? [];

  return {
    user,
    profileQuery,
    studentProfile,
    isMinor,
    myGuardians,
    requests,
    sessions,
    unread,
    learningSummary,
    myRequests,
    upcomingSessions,
    nextSession,
    activeTutors,
    metrics,
    assignments,
    submissions,
    pendingAssignments,
    progressReports,
    isLoading: requests.isLoading || sessions.isLoading || profileQuery.isLoading,
  };
}
