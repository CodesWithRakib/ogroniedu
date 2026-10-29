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
  Scale,
  Sparkles,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  EmptyState,
  LoadingSpinner,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { formatWeekdayDate, formatBDTMinor } from '@/lib/format';
import { useBookingRequests } from '../hooks/use-booking-requests';
import { useChildScope } from '@/features/guardian/hooks/use-child-scope';
import { ChildScopeSelect } from '@/features/guardian/components/ChildScopeSelect';
import type { BookingRequestItem } from '@/store/services/bookings-api';

type FilterStatus = 'all' | 'requested' | 'accepted' | 'disputed' | 'closed';

/**
 * Production-ready Tutoring Requests Management:
 * Supports student and tutor workflows with status tabs, rich tuition cards,
 * fee formatting, tutor/student credentials, and direct action triggers.
 */
export function RequestsPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const scope = useChildScope();
  const req = useBookingRequests(locale, scope.selectedStudentId);
  const { items } = req;
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'requested') return item.status === 'requested';
      if (activeFilter === 'accepted') {
        return ['accepted', 'awaiting_payment', 'confirmed', 'in_progress'].includes(item.status);
      }
      if (activeFilter === 'disputed') {
        return item.status === 'disputed' || item.status === 'replacement_requested';
      }
      if (activeFilter === 'closed') {
        return (
          item.status === 'declined' ||
          item.status === 'withdrawn' ||
          item.status === 'cancelled' ||
          item.status === 'expired' ||
          item.status === 'completed'
        );
      }
      return true;
    });
  }, [items, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      requested: items.filter((i) => i.status === 'requested').length,
      accepted: items.filter((i) =>
        ['accepted', 'awaiting_payment', 'confirmed', 'in_progress'].includes(i.status),
      ).length,
      disputed: items.filter((i) => ['disputed', 'replacement_requested'].includes(i.status))
        .length,
      closed: items.filter((i) =>
        ['declined', 'withdrawn', 'cancelled', 'expired', 'completed'].includes(i.status),
      ).length,
    };
  }, [items]);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'disputed':
        return (
          <Badge
            variant="warning"
            className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold"
          >
            <Scale className="w-3 h-3 text-amber-700" />
            <span>{locale === 'bn' ? 'বিরোধ চলছে' : 'Disputed'}</span>
          </Badge>
        );
      case 'replacement_requested':
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-purple-50 text-purple-950 border border-purple-300 font-bold"
          >
            <Sparkles className="w-3 h-3 text-purple-700" />
            <span>{locale === 'bn' ? 'রিপ্লেসমেন্ট অনুরোধ' : 'Replacement'}</span>
          </Badge>
        );
      case 'accepted':
      case 'awaiting_payment':
        return (
          <Badge
            variant="warning"
            className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold"
          >
            <CreditCard className="w-3 h-3 text-amber-700" />
            <span>{locale === 'bn' ? 'পেমেন্ট বাকি' : 'Payment due'}</span>
          </Badge>
        );
      case 'confirmed':
      case 'in_progress':
        return (
          <Badge
            variant="success"
            className="flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>{locale === 'bn' ? 'নিশ্চিত' : 'Confirmed'}</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-slate-100 text-slate-900 border border-slate-300 font-bold"
          >
            <CheckCircle2 className="w-3 h-3 text-slate-700" />
            <span>{locale === 'bn' ? 'সম্পন্ন' : 'Completed'}</span>
          </Badge>
        );
      case 'requested':
        return (
          <Badge
            variant="warning"
            className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold animate-pulse"
          >
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{locale === 'bn' ? 'বিবেচনাধীন' : 'Pending'}</span>
          </Badge>
        );
      case 'declined':
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 bg-rose-100 text-rose-950 border border-rose-300 font-bold"
          >
            <XCircle className="w-3 h-3 text-rose-700" />
            <span>{locale === 'bn' ? 'প্রত্যাখ্যাত' : 'Declined'}</span>
          </Badge>
        );
      case 'cancelled':
      case 'expired':
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 bg-rose-100 text-rose-950 border border-rose-300 font-bold"
          >
            <XCircle className="w-3 h-3 text-rose-700" />
            <span>{locale === 'bn' ? 'বাতিল' : 'Cancelled'}</span>
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 font-bold"
          >
            <AlertCircle className="w-3 h-3 text-slate-600" />
            <span>{locale === 'bn' ? 'প্রত্যাহারকৃত' : 'Withdrawn'}</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
    }
  }

  function getModeLabel(mode: string) {
    if (mode === 'online') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-bold">
          <Wifi className="w-3 h-3 text-blue-700" />
          {locale === 'bn' ? 'অনলাইন' : 'Online'}
        </span>
      );
    }
    if (mode === 'in_person') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold">
          <MapPin className="w-3 h-3 text-emerald-700" />
          {locale === 'bn' ? 'সরাসরি (ইন-পার্সন)' : 'In Person'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-950 border border-purple-200 font-bold">
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
      {/* Hero banner — clean cohesive layout */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 sm:p-6 text-foreground">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary w-fit">
              <BookOpen className="w-3.5 h-3.5" />
              {locale === 'bn' ? 'বুকিং ওয়ার্কস্পেস' : 'Booking workspace'}
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground">
              {locale === 'bn' ? (
                <>
                  আপনার টিউশন <span className="text-primary">অনুরোধসমূহ</span>
                </>
              ) : (
                <>
                  Your tutoring <span className="text-primary">inquiries</span>
                </>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              {locale === 'bn'
                ? 'শিক্ষকের উত্তর, পেমেন্টের অবস্থা ও ক্লাসের অগ্রগতি এক জায়গায় ট্র্যাক করুন।'
                : 'Track tutor responses, payment status and class progress in one place.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ChildScopeSelect locale={locale} scope={scope} />
            {!req.isTutor && (
              <Link href={withLocale('/tutors', locale)}>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold"
                >
                  <Search className="w-4 h-4 mr-1.5" />
                  {locale === 'bn' ? 'নতুন শিক্ষক খুঁজুন' : 'Find a Tutor'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-surface text-foreground hover:bg-surface-hover border border-border'
          }`}
        >
          <span>{locale === 'bn' ? 'সকল অনুরোধ' : 'All Requests'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-surface-muted text-foreground'
            }`}
          >
            {counts.all}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('requested')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeFilter === 'requested'
              ? 'bg-warning text-white shadow-xs'
              : 'bg-warning-soft text-warning hover:bg-warning-soft/80 border border-warning/30'
          }`}
        >
          <span>{locale === 'bn' ? 'বিবেচনাধীন' : 'Pending'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'requested'
                ? 'bg-white/20 text-white'
                : 'bg-surface-muted text-foreground'
            }`}
          >
            {counts.requested}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('accepted')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeFilter === 'accepted'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-primary-soft text-primary hover:bg-primary-soft/80 border border-primary/30'
          }`}
        >
          <span>{locale === 'bn' ? 'অনুমোদিত' : 'Accepted'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'accepted'
                ? 'bg-white/20 text-white'
                : 'bg-surface-muted text-foreground'
            }`}
          >
            {counts.accepted}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('disputed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeFilter === 'disputed'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'বিরোধ / ডিসপিউট' : 'Disputed'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'disputed'
                ? 'bg-white/20 text-white'
                : 'bg-white text-amber-950 border border-amber-200'
            }`}
          >
            {counts.disputed}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter('closed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeFilter === 'closed'
              ? 'bg-muted text-foreground shadow-xs'
              : 'bg-surface text-muted-foreground hover:bg-surface-hover border border-border'
          }`}
        >
          <span>{locale === 'bn' ? 'বাতিল / শেষ' : 'Closed'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === 'closed'
                ? 'bg-surface text-foreground'
                : 'bg-surface-muted text-foreground'
            }`}
          >
            {counts.closed}
          </span>
        </button>
      </div>

      {req.actionError && (
        <Alert variant="destructive" className="mb-4" data-testid="requests-action-error">
          <AlertDescription role="alert">{req.actionError}</AlertDescription>
        </Alert>
      )}

      {req.isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : req.queryError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
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
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5"
          data-testid="requests-list"
        >
          {filteredItems.map((r: BookingRequestItem) => {
            const tutorUser = r.tutorProfile?.user;
            const tutorName =
              tutorUser?.displayName ||
              tutorUser?.fullName ||
              (locale === 'bn' ? 'শিক্ষক' : 'Tutor');
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
                className="flex flex-col justify-between bg-card border border-border hover:border-primary/50 text-foreground transition-colors rounded-xl overflow-hidden"
              >
                <CardHeader className="flex flex-col gap-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                      ID: #{r.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {req.isTutor
                          ? locale === 'bn'
                            ? `শিক্ষার্থী: ${otherPartyName}`
                            : `Student: ${otherPartyName}`
                          : locale === 'bn'
                            ? `শিক্ষক: ${otherPartyName}`
                            : `Tutor: ${otherPartyName}`}
                      </h3>
                      {r.tutorProfile?.headline && !req.isTutor && (
                        <p className="text-xs text-slate-700 font-medium line-clamp-1 mt-0.5">
                          {r.tutorProfile.headline}
                        </p>
                      )}
                    </div>
                    {rateFormatted && (
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-slate-900 font-mono">
                          {rateFormatted}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-600">
                          {locale === 'bn' ? '/সেশন' : '/session'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 text-xs pt-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs">
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      {subjectTitle}
                    </span>
                    {levelTitle && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-bold text-xs">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                        {levelTitle}
                      </span>
                    )}
                    {getModeLabel(r.mode)}
                  </div>

                  {r.messageNotes && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed italic font-medium">
                      "{r.messageNotes}"
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold pt-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      {locale === 'bn' ? 'অনুরোধের তারিখ:' : 'Requested on:'}{' '}
                      {formatWeekdayDate(r.createdAt, locale)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-card">
                  {/* Student Actions */}
                  {!req.isTutor && (
                    <>
                      {r.status === 'requested' && (
                        <div className="flex items-center justify-between w-full">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={req.withdrawing}
                            onClick={() => req.handleWithdraw(r.id)}
                            data-testid={`withdraw-btn-${r.id}`}
                            className="text-rose-800 hover:bg-rose-50 border-rose-300 hover:border-rose-400 text-xs font-bold"
                          >
                            {dict.bookingRequest.withdrawButton}
                          </Button>
                        </div>
                      )}

                      {['accepted', 'awaiting_payment'].includes(r.status) && (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/dashboard/student/sessions', locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              <Video className="w-3.5 h-3.5 mr-1 text-blue-700" />
                              {locale === 'bn' ? 'ক্লাস সময়সূচি' : 'Classes'}
                            </Button>
                          </Link>
                          <Link href={withLocale(`/dashboard/bookings/${r.id}/pay`, locale)}>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              {locale === 'bn' ? 'পেমেন্ট করুন' : 'Make Payment'}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {['confirmed', 'in_progress', 'completed'].includes(r.status) && (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/dashboard/student/sessions', locale)}>
                            <Button
                              size="sm"
                              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Video className="w-3.5 h-3.5 mr-1" />
                              {locale === 'bn' ? 'ক্লাস সময়সূচি' : 'Classes'}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {['disputed', 'replacement_requested'].includes(r.status) && (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>
                                {locale === 'bn' ? 'বিরোধ বিবরণ দেখুন' : 'View Dispute Dossier'}
                              </span>
                            </Button>
                          </Link>
                        </div>
                      )}

                      {['declined', 'withdrawn', 'cancelled', 'expired'].includes(r.status) && (
                        <div className="flex items-center justify-between w-full">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বুকিং বিবরণ' : 'Booking Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/tutors', locale)}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs font-bold text-primary hover:text-primary hover:bg-primary-soft"
                            >
                              {locale === 'bn' ? 'অন্য শিক্ষক খুঁজুন' : 'Search Other Tutors'}
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tutor Actions */}
                  {req.isTutor && (
                    <>
                      {r.status === 'requested' && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={req.responding}
                            onClick={() => req.handleRespond(r.id, 'decline')}
                            data-testid={`decline-btn-${r.id}`}
                            className="text-rose-800 hover:bg-rose-50 border-rose-300 text-xs font-bold"
                          >
                            {dict.bookingRequest.declineButton}
                          </Button>
                          <Button
                            size="sm"
                            disabled={req.responding}
                            onClick={() => req.handleRespond(r.id, 'accept')}
                            data-testid={`accept-btn-${r.id}`}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl"
                          >
                            {dict.bookingRequest.acceptButton}
                          </Button>
                        </div>
                      )}
                      {['accepted', 'awaiting_payment', 'confirmed', 'in_progress'].includes(
                        r.status,
                      ) && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/dashboard/tutor/sessions', locale)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                            >
                              {locale === 'bn' ? 'শিডিউল দেখুন' : 'View Schedule'}
                            </Button>
                          </Link>
                        </div>
                      )}
                      {['disputed', 'replacement_requested'].includes(r.status) && (
                        <Link
                          href={withLocale(`/dashboard/bookings/${r.id}`, locale)}
                          className="ml-auto"
                        >
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{locale === 'bn' ? 'বিরোধ বিবরণ দেখুন' : 'View Dispute'}</span>
                          </Button>
                        </Link>
                      )}
                      {['declined', 'withdrawn', 'cancelled', 'completed', 'expired'].includes(
                        r.status,
                      ) && (
                        <Link
                          href={withLocale(`/dashboard/bookings/${r.id}`, locale)}
                          className="ml-auto"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold border-slate-300 text-slate-900 hover:bg-slate-100"
                          >
                            {locale === 'bn' ? 'বুকিং বিবরণ' : 'Booking Details'}
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
