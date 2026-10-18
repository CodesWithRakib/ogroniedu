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
          <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
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
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-info-soft  text-info-soft-foreground  border border-info/20 ">
          <Wifi className="w-3 h-3" />
          {locale === 'bn' ? 'অনলাইন' : 'Online'}
        </span>
      );
    }
    if (mode === 'in_person') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-soft  text-success-soft-foreground  border border-primary/20 ">
          <MapPin className="w-3 h-3" />
          {locale === 'bn' ? 'সরাসরি (ইন-পার্সন)' : 'In Person'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-interactive-soft  text-interactive  border border-interactive/20 ">
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            {locale === 'bn' ? 'আপনার টিউশন অনুরোধসমূহ' : 'Your Tutoring Inquiries'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl font-normal leading-relaxed">
            {locale === 'bn'
              ? 'শিক্ষকের উত্তর পাওয়ার সাথে সাথে আপনাকে নোটিফিকেশন ও এসএমএস পাঠানো হয়।'
              : 'You will receive instant notifications when the tutor responds.'}
          </p>
        </div>
        {!req.isTutor && (
          <Link href={withLocale('/tutors', locale)}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-hover text-white shadow-xs rounded-xl font-semibold shrink-0"
            >
              <Search className="w-4 h-4 mr-1.5" />
              {locale === 'bn' ? 'নতুন শিক্ষক খুঁজুন' : 'Find a Tutor'}
            </Button>
          </Link>
        )}
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="requests-list">
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
                className="flex flex-col justify-between bg-card border border-border hover:border-primary/40 text-foreground hover:shadow-sm transition-all rounded-2xl overflow-hidden shadow-xs"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      ID: #{r.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-foreground tracking-tight">
                        {req.isTutor
                          ? locale === 'bn'
                            ? `শিক্ষার্থী: ${otherPartyName}`
                            : `Student: ${otherPartyName}`
                          : locale === 'bn'
                            ? `শিক্ষক: ${otherPartyName}`
                            : `Tutor: ${otherPartyName}`}
                      </h3>
                      {r.tutorProfile?.headline && !req.isTutor && (
                        <p className="text-xs text-muted-foreground font-medium line-clamp-1 mt-0.5">
                          {r.tutorProfile.headline}
                        </p>
                      )}
                    </div>
                    {rateFormatted && (
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-foreground">
                          {rateFormatted}
                        </span>
                        <span className="block text-[10px] font-semibold text-muted-foreground">
                          {locale === 'bn' ? '/সেশন' : '/session'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs pt-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface text-foreground border border-border font-medium text-xs">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      {subjectTitle}
                    </span>
                    {levelTitle && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface text-foreground border border-border font-medium text-xs">
                        <GraduationCap className="w-3.5 h-3.5 text-interactive" />
                        {levelTitle}
                      </span>
                    )}
                    {getModeLabel(r.mode)}
                  </div>

                  {r.messageNotes && (
                    <div className="p-3 rounded-xl bg-surface border border-border text-foreground text-xs leading-relaxed italic">
                      "{r.messageNotes}"
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
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
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={req.withdrawing}
                          onClick={() => req.handleWithdraw(r.id)}
                          data-testid={`withdraw-btn-${r.id}`}
                          className="text-destructive hover:bg-destructive-soft border-destructive/30 hover:border-destructive text-xs font-semibold"
                        >
                          {dict.bookingRequest.withdrawButton}
                        </Button>
                      )}

                      {r.status === 'accepted' && (
                        <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                          <Link href={withLocale(`/dashboard/bookings/${r.id}`, locale)}>
                            <Button size="sm" variant="outline" className="text-xs font-semibold">
                              {locale === 'bn' ? 'বিস্তারিত' : 'Details'}
                            </Button>
                          </Link>
                          <Link href={withLocale('/dashboard/student/sessions', locale)}>
                            <Button size="sm" variant="outline" className="text-xs font-semibold">
                              <Video className="w-3.5 h-3.5 mr-1 text-primary" />
                              {locale === 'bn' ? 'ক্লাস সময়সূচি' : 'Classes'}
                            </Button>
                          </Link>
                          <Link href={withLocale(`/dashboard/bookings/${r.id}/pay`, locale)}>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              {locale === 'bn' ? 'পেমেন্ট করুন' : 'Make Payment'}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {['declined', 'withdrawn', 'cancelled'].includes(r.status) && (
                        <Link href={withLocale('/tutors', locale)} className="ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary-soft"
                          >
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
                            className="bg-primary hover:bg-primary-hover text-white text-xs"
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
