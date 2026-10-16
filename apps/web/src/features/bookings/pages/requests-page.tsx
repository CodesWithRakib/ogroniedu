'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  Wifi,
  MapPin,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Video,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  EmptyState,
  LoadingSpinner,
  Badge,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { formatWeekdayDate, formatBDTMinor } from '@/lib/format';
import { useBookingRequests } from '../hooks/use-booking-requests';
import type { BookingRequestItem } from '@/store/services/bookings-api';

type FilterStatus = 'all' | 'requested' | 'accepted' | 'closed';

/**
 * Production-ready Tutoring Requests Management:
 * Supports student and tutor workflows with status tabs, rich tuition cards,
 * fee formatting, tutor/student credentials, and direct action triggers.
 */
export function RequestsPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const req = useBookingRequests(locale);
  const { items } = req;
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'requested') return item.status === 'requested';
      if (activeFilter === 'accepted') return item.status === 'accepted';
      if (activeFilter === 'closed') {
        return (
          item.status === 'declined' ||
          item.status === 'withdrawn' ||
          item.status === 'cancelled' ||
          item.status === 'expired'
        );
      }
      return true;
    });
  }, [items, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      requested: items.filter((i) => i.status === 'requested').length,
      accepted: items.filter((i) => i.status === 'accepted').length,
      closed: items.filter((i) =>
        ['declined', 'withdrawn', 'cancelled', 'expired'].includes(i.status),
      ).length,
    };
  }, [items]);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'accepted':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{locale === 'bn' ? 'অনুমোদিত' : 'Accepted'}</span>
          </Badge>
        );
      case 'requested':
        return (
          <Badge variant="warning" className="flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" />
            <span>{locale === 'bn' ? 'বিবেচনাধীন' : 'Pending'}</span>
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>{locale === 'bn' ? 'প্রত্যাখ্যাত' : 'Declined'}</span>
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-slate-500">
            <AlertCircle className="w-3 h-3" />
            <span>{locale === 'bn' ? 'প্রত্যাহারকৃত' : 'Withdrawn'}</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getModeLabel(mode: string) {
    if (mode === 'online') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          <Wifi className="w-3 h-3" />
          {locale === 'bn' ? 'অনলাইন' : 'Online'}
        </span>
      );
    }
    if (mode === 'in_person') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <MapPin className="w-3 h-3" />
          {locale === 'bn' ? 'সরাসরি (ইন-পার্সন)' : 'In Person'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        {locale === 'bn' ? 'হাইব্রিড' : 'Hybrid'}
      </span>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'টিউটরিং অনুরোধ ও বুকিং' : 'Tutoring Requests & Bookings'}
      subtitle={
        locale === 'bn'
          ? 'নতুন টিউশন বুকিং ট্র্যাক করুন, শিক্ষকের সাথে যোগাযোগ ও নিশ্চিতকরণ পরিচালনা করুন'
          : 'Track new tuition bookings, manage tutor confirmations and progress'
      }
    >
      {/* Top Banner & Quick Actions */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-900/10 via-emerald-900/10 to-transparent dark:from-cyan-950/30 dark:via-emerald-950/30 p-4 rounded-2xl border border-cyan-200/50 dark:border-cyan-800/40">
        <div>
          <h2 className="text-lg font-bold text-white">
            {locale === 'bn' ? 'আপনার টিউশন অনুরোধসমূহ' : 'Your Tutoring Inquiries'}
          </h2>
          <p className="text-xs text-teal-300/80">
            {locale === 'bn'
              ? 'শিক্ষকের উত্তর পাওয়ার সাথে সাথে আপনাকে নোটিফিকেশন ও ইমেইল পাঠানো হয়।'
              : 'You will receive instant notifications when the tutor responds.'}
          </p>
        </div>
        {!req.isTutor && (
          <Link href={withLocale('/tutors', locale)}>
            <Button size="sm" className="bg-cyan-700 hover:bg-cyan-800 text-white shrink-0">
              <Search className="w-4 h-4 mr-1.5" />
              {locale === 'bn' ? 'নতুন শিক্ষক খুঁজুন' : 'Find a Tutor'}
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-teal-500/20 pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
              : 'bg-white/10 text-slate-200 hover:bg-white/15 border border-white/10'
          }`}
        >
          <span>{locale === 'bn' ? 'সকল অনুরোধ' : 'All Requests'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {counts.all}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('requested')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'requested'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-500/30'
          }`}
        >
          <span>{locale === 'bn' ? 'বিবেচনাধীন' : 'Pending'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {counts.requested}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('accepted')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'accepted'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/30'
          }`}
        >
          <span>{locale === 'bn' ? 'অনুমোদিত' : 'Accepted'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {counts.accepted}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('closed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'closed'
              ? 'bg-slate-400 text-slate-950 font-bold shadow-xs'
              : 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10'
          }`}
        >
          <span>{locale === 'bn' ? 'বাতিল / শেষ' : 'Closed'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
            {counts.closed}
          </span>
        </button>
      </div>

      {req.actionError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          data-testid="requests-action-error"
        >
          {req.actionError}
        </div>
      )}

      {req.isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : req.queryError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-rose-600">
            {req.queryError}
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={
            activeFilter === 'all'
              ? dict.feedback.emptyStateTitle
              : locale === 'bn'
                ? 'এই ফিল্টারে কোনো অনুরোধ নেই'
                : 'No requests in this category'
          }
          description={
            activeFilter === 'all'
              ? dict.feedback.emptyStateDescription
              : locale === 'bn'
                ? 'অন্যান্য ফিল্টার দেখুন অথবা নতুন শিক্ষকের সাথে যোগাযোগ করুন।'
                : 'Switch filters or search for another qualified tutor.'
          }
          actionLabel={req.isTutor ? undefined : dict.nav.findTutors}
          actionHref={req.isTutor ? undefined : withLocale('/tutors', locale)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="requests-list">
          {filteredItems.map((r: BookingRequestItem) => {
            const tutorUser = r.tutorProfile?.user;
            const tutorName =
              tutorUser?.displayName || tutorUser?.fullName || (locale === 'bn' ? 'শিক্ষক' : 'Tutor');
            const studentUser = r.studentUser;
            const studentName =
              studentUser?.displayName ||
              studentUser?.fullName ||
              (locale === 'bn' ? 'শিক্ষার্থী' : 'Student');
            const otherPartyName = req.isTutor ? studentName : tutorName;

            const subjectTitle =
              locale === 'bn' && r.subject?.nameBn
                ? r.subject.nameBn
                : r.subject?.name || (locale === 'bn' ? 'সাধারণ বিষয়' : 'General Subject');

            const levelTitle =
              locale === 'bn' && r.educationLevel?.nameBn
                ? r.educationLevel.nameBn
                : r.educationLevel?.name || '';

            const rateFormatted = r.pricePerSessionMinor
              ? formatBDTMinor(Number(r.pricePerSessionMinor), locale)
              : null;

            return (
              <Card
                key={r.id}
                data-testid={`request-card-${r.id}`}
                className="flex flex-col justify-between bg-[#062127]/90 border border-teal-500/20 text-white hover:shadow-xl transition-all rounded-2xl overflow-hidden shadow-xs"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-teal-300/60">
                      ID: #{r.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {req.isTutor
                          ? locale === 'bn'
                            ? `শিক্ষার্থী: ${otherPartyName}`
                            : `Student: ${otherPartyName}`
                          : locale === 'bn'
                            ? `শিক্ষক: ${otherPartyName}`
                            : `Tutor: ${otherPartyName}`}
                      </h3>
                      {r.tutorProfile?.headline && !req.isTutor && (
                        <p className="text-xs text-teal-200/80 line-clamp-1 mt-0.5">
                          {r.tutorProfile.headline}
                        </p>
                      )}
                    </div>
                    {rateFormatted && (
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-400">
                          {rateFormatted}
                        </span>
                        <span className="block text-[10px] text-teal-300/70">
                          {locale === 'bn' ? '/সেশন' : '/session'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs pt-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-white border border-white/10 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      {subjectTitle}
                    </span>
                    {levelTitle && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-teal-200 border border-white/10">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        {levelTitle}
                      </span>
                    )}
                    {getModeLabel(r.mode)}
                  </div>

                  {r.messageNotes && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-teal-100 italic">
                      "{r.messageNotes}"
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-teal-300/70 pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'bn' ? 'অনুরোধের তারিখ:' : 'Requested on:'}{' '}
                      {formatWeekdayDate(r.createdAt, locale)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-teal-500/20 flex flex-wrap items-center justify-between gap-2 bg-white/5">
                  {/* Student Actions */}
                  {!req.isTutor && (
                    <>
                      {r.status === 'requested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={req.withdrawing}
                          onClick={() => req.handleWithdraw(r.id)}
                          data-testid={`withdraw-btn-${r.id}`}
                          className="text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300 text-xs"
                        >
                          {dict.bookingRequest.withdrawButton}
                        </Button>
                      )}

                      {r.status === 'accepted' && (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button size="sm" variant="ghost" className="text-xs text-teal-300 hover:text-white">
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/dashboard/student/sessions', locale)}>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Video className="w-3.5 h-3.5 mr-1" />
                              {locale === 'bn' ? 'ক্লাস সময়সূচি' : 'Classes'}
                            </Button>
                          </Link>
                          <Link
                            href={withLocale(
                              `/dashboard/bookings/${r.id}/pay`,
                              locale,
                            )}
                          >
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              {locale === 'bn' ? 'পেমেন্ট করুন' : 'Make Payment'}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {['declined', 'withdrawn', 'cancelled'].includes(r.status) && (
                        <Link href={withLocale('/tutors', locale)} className="ml-auto">
                          <Button size="sm" variant="ghost" className="text-xs text-cyan-600">
                            {locale === 'bn' ? 'অন্য শিক্ষক খুঁজুন' : 'Search Other Tutors'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </>
                  )}

                  {/* Tutor Actions */}
                  {req.isTutor && (
                    <>
                      {r.status === 'requested' && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={req.responding}
                            onClick={() => req.handleRespond(r.id, 'decline')}
                            data-testid={`decline-btn-${r.id}`}
                            className="text-xs"
                          >
                            {dict.bookingRequest.declineButton}
                          </Button>
                          <Button
                            size="sm"
                            disabled={req.responding}
                            onClick={() => req.handleRespond(r.id, 'accept')}
                            data-testid={`accept-btn-${r.id}`}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            {dict.bookingRequest.acceptButton}
                          </Button>
                        </div>
                      )}
                      {r.status === 'accepted' && (
                        <Link
                          href={withLocale('/dashboard/tutor/sessions', locale)}
                          className="ml-auto"
                        >
                          <Button size="sm" variant="outline" className="text-xs">
                            {locale === 'bn' ? 'শিডিউল দেখুন' : 'View Schedule'}
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
