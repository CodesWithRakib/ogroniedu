'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Sparkles,
  Calendar,
  MapPin,
  DollarSign,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  PlusCircle,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CreditCard,
  Wifi,
  Scale,
  Search,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button, LoadingSpinner, Badge, EmptyState } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { formatWeekdayDate, formatBDTMinor } from '@/lib/format';
import {
  useGetMyTuitionRequestsQuery,
  useRespondToTuitionSuggestionMutation,
  useCancelTuitionRequestMutation,
} from '@/store/services/tuition-requests-api';
import { useBookingRequests } from '@/features/bookings/hooks/use-booking-requests';
import { useChildScope } from '@/features/guardian/hooks/use-child-scope';
import { ChildScopeSelect } from '@/features/guardian/components/ChildScopeSelect';
import type { BookingRequestItem } from '@/store/services/bookings-api';

type TabType = 'matches' | 'bookings';
type FilterStatus = 'all' | 'requested' | 'accepted' | 'disputed' | 'closed';

export interface RequestsHubPageProps {
  locale: Locale;
  role?: 'guardian' | 'student';
}

export function RequestsHubPage({ locale, role = 'guardian' }: RequestsHubPageProps) {
  const isBn = locale === 'bn';
  const isStudent = role === 'student';
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const paymentsHref = isStudent ? '/dashboard/student/payments' : '/dashboard/guardian/payments';
  const messagesHref = isStudent ? '/dashboard/student/messages' : '/dashboard/guardian/messages';
  const replacementsHref = isStudent ? '/tutor-replacements' : '/dashboard/guardian/replacements';

  // --- TAB 1: TUITION REQUESTS & ADMIN SUGGESTIONS STATE ---
  const { data: tuitionData, isLoading: isTuitionLoading, refetch: refetchTuition } = useGetMyTuitionRequestsQuery();
  const [respondToSuggestion, { isLoading: isResponding }] = useRespondToTuitionSuggestionMutation();
  const [cancelRequest, { isLoading: isCancelling }] = useCancelTuitionRequestMutation();
  const [tuitionFeedback, setTuitionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const tuitionRequests = tuitionData?.data || [];

  const handleRespond = async (
    suggestionId: string,
    action: 'accept' | 'decline' | 'request_demo',
  ) => {
    try {
      await respondToSuggestion({ suggestionId, action }).unwrap();
      setTuitionFeedback({
        type: 'success',
        message:
          action === 'accept'
            ? isBn
              ? 'শিক্ষক সফলভাবে নিশ্চিত ও টিউশন চূড়ান্ত করা হয়েছে!'
              : 'Tutor confirmed & tuition finalized!'
            : isBn
              ? 'অন্য শিক্ষক খোঁজার অনুরোধ নথিভুক্ত হয়েছে।'
              : 'Alternative tutor requested.',
      });
      refetchTuition();
    } catch (err: any) {
      setTuitionFeedback({
        type: 'error',
        message: err?.data?.message || (isBn ? 'অ্যাকশন সম্পন্ন করতে ব্যর্থ' : 'Action failed'),
      });
    }
  };

  const handleCancelTuition = async (requestId: string) => {
    if (
      !window.confirm(
        isBn ? 'আপনি কি নিশ্চিত যে এই রিকোয়েস্টটি বাতিল করতে চান?' : 'Cancel this tuition request?',
      )
    )
      return;
    try {
      await cancelRequest(requestId).unwrap();
      setTuitionFeedback({
        type: 'success',
        message: isBn ? 'রিকোয়েস্ট বাতিল করা হয়েছে' : 'Request cancelled',
      });
      refetchTuition();
    } catch (err: any) {
      setTuitionFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to cancel',
      });
    }
  };

  // --- TAB 2: DIRECT BOOKINGS STATE ---
  const scope = useChildScope();
  const bookingReq = useBookingRequests(locale, scope.selectedStudentId);
  const { items: bookingItems } = bookingReq;
  const [bookingFilter, setBookingFilter] = useState<FilterStatus>('all');

  const filteredBookings = useMemo(() => {
    return bookingItems.filter((item) => {
      if (bookingFilter === 'all') return true;
      if (bookingFilter === 'requested') return item.status === 'requested';
      if (bookingFilter === 'accepted') {
        return ['accepted', 'awaiting_payment', 'confirmed', 'in_progress'].includes(item.status);
      }
      if (bookingFilter === 'disputed') {
        return item.status === 'disputed' || item.status === 'replacement_requested';
      }
      if (bookingFilter === 'closed') {
        return [
          'declined',
          'withdrawn',
          'cancelled',
          'expired',
          'completed',
        ].includes(item.status);
      }
      return true;
    });
  }, [bookingItems, bookingFilter]);

  const bookingCounts = useMemo(() => {
    return {
      all: bookingItems.length,
      requested: bookingItems.filter((i) => i.status === 'requested').length,
      accepted: bookingItems.filter((i) =>
        ['accepted', 'awaiting_payment', 'confirmed', 'in_progress'].includes(i.status),
      ).length,
      disputed: bookingItems.filter((i) =>
        ['disputed', 'replacement_requested'].includes(i.status),
      ).length,
      closed: bookingItems.filter((i) =>
        ['declined', 'withdrawn', 'cancelled', 'expired', 'completed'].includes(i.status),
      ).length,
    };
  }, [bookingItems]);

  function getBookingStatusBadge(status: string) {
    switch (status) {
      case 'disputed':
        return (
          <Badge variant="warning" className="flex items-center gap-1 bg-red-100 text-red-900 border border-red-300 font-bold">
            <Scale className="w-3 h-3 text-red-700" />
            <span>{isBn ? 'বিরোধ / ডিসপ্যুট' : 'Disputed'}</span>
          </Badge>
        );
      case 'replacement_requested':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-950 border border-purple-300 font-bold">
            <Sparkles className="w-3 h-3 text-purple-700" />
            <span>{isBn ? 'রিপ্লেসমেন্ট অনুরোধ' : 'Replacement'}</span>
          </Badge>
        );
      case 'accepted':
      case 'awaiting_payment':
        return (
          <Badge variant="warning" className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold">
            <CreditCard className="w-3 h-3 text-amber-700" />
            <span>{isBn ? 'পেমেন্ট বাকি' : 'Payment due'}</span>
          </Badge>
        );
      case 'confirmed':
      case 'in_progress':
        return (
          <Badge variant="success" className="flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>{isBn ? 'নিশ্চিত' : 'Confirmed'}</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-slate-100 text-slate-900 border border-slate-300 font-bold">
            <CheckCircle2 className="w-3 h-3 text-slate-700" />
            <span>{isBn ? 'সম্পন্ন' : 'Completed'}</span>
          </Badge>
        );
      case 'requested':
        return (
          <Badge variant="warning" className="flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold animate-pulse">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{isBn ? 'বিবেচনাধীন' : 'Pending'}</span>
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-bold">
            <XCircle className="w-3 h-3" />
            <span>{isBn ? 'বাতিল' : 'Declined'}</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
    }
  }

  return (
    <DashboardShell
      locale={locale}
      role={role}
      title={isBn ? 'টিউশন রিকোয়েস্ট ও শিক্ষক প্রস্তাব' : 'Tuition Matches & Requests'}
      subtitle={
        isBn
          ? isStudent
            ? 'আপনার পোস্ট করা টিউশন রিকোয়েস্ট, প্রস্তাবিত শিক্ষক ও বুকিং স্ট্যাটাস পরিচালনা করুন'
            : 'প্ল্যাটফর্মের মাধ্যমে টিউটর প্রস্তাব পর্যালোচনা ও শিক্ষক নিশ্চিত করুন'
          : isStudent
            ? 'Track your tuition requests, suggested educators, and booking status'
            : 'Review admin-curated tutor matches and manage tuition bookings'
      }
      actions={
        <div className="flex items-center gap-2.5">
          {!isStudent && <ChildScopeSelect locale={locale} scope={scope} />}
          <Link href={withLocale('/request-tutor', locale)}>
            <Button size="sm" className="flex items-center gap-1.5 font-bold shadow-xs">
              <PlusCircle className="w-4 h-4" />
              {isBn ? 'নতুন রিকোয়েস্ট' : 'New Request'}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 100% Tutor Replacement & Escrow Guarantee Banner */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Shield className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isBn ? '১০০% টিউটর রিপ্লেসমেন্ট ও সুরক্ষা পলিসি' : '100% Free Tutor Replacement Guarantee'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {isBn ? 'নিরাপদ' : 'Protected'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                {isBn
                  ? 'শিক্ষকের পাঠদান সন্তোষজনক না হলে অথবা সময়সূচী না মিললে সম্পূর্ণ বিনামূল্যে নতুন শিক্ষক প্রদান বা সম্পূর্ণ ফি ফেরত প্রদান করা হয়।'
                  : isStudent
                    ? 'If an educator does not match your learning expectations, claim a 100% free replacement or full escrow refund anytime.'
                    : 'If an educator does not match your child’s learning expectations, claim a 100% free replacement or full escrow refund anytime.'}
              </p>
            </div>
          </div>

          <Link href={withLocale(isStudent ? '/dashboard/student/requests' : '/dashboard/guardian/replacements', locale)} className="shrink-0">
            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
              {isBn ? 'রিপ্লেসমেন্ট ক্লেইম' : 'Claim Replacement'}
            </Button>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'matches'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? 'শিক্ষক প্রস্তাব ও রিকোয়েস্ট' : 'Tuition Matches & Suggestions'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'matches'
                  ? 'bg-white/20 text-white'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              }`}
            >
              {tuitionRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isBn ? 'কনফার্মড বুকিং হিস্ট্রি' : 'Confirmed Bookings & History'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'bookings'
                  ? 'bg-white/20 text-white'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              }`}
            >
              {bookingItems.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CURATED TUITION MATCHES & SUGGESTIONS                              */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {tuitionFeedback && (
              <Alert variant={tuitionFeedback.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{tuitionFeedback.message}</AlertDescription>
              </Alert>
            )}

            {isTuitionLoading ? (
              <div className="py-20 text-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : tuitionRequests.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'আপনার কোনো সক্রিয় টিউশন রিকোয়েস্ট নেই' : 'No Active Tuition Requests'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
                  {isBn
                    ? isStudent
                      ? 'আপনার ক্লাসের জন্য একটি রিকোয়েস্ট পোস্ট করুন, আমাদের অ্যাকাডেমিক টিম সেরা শিক্ষক খুঁজে দেবে।'
                      : 'আপনার সন্তানের ক্লাসের জন্য একটি রিকোয়েস্ট পোস্ট করুন, আমাদের অ্যাকাডেমিক টিম সেরা শিক্ষক খুঁজে দেবে।'
                    : isStudent
                      ? 'Post your requirements and our academic team will match vetted educators for you.'
                      : 'Post your requirements and our academic team will match vetted educators for your child.'}
                </p>
                <Link href={withLocale('/request-tutor', locale)}>
                  <Button size="sm" className="font-bold">
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    {isBn ? 'এখনই রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
                  </Button>
                </Link>
              </Card>
            ) : (
              tuitionRequests.map((req) => (
                <Card key={req.id} className="border-border bg-card shadow-xs overflow-hidden">
                  <CardHeader className="p-5 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-primary">{req.requestReference}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            req.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : req.status === 'matched'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : req.status === 'demo_scheduled'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : req.status === 'cancelled'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.isVip && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                            VIP
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {req.studentName} •{' '}
                        {req.educationLevel ? (isBn ? req.educationLevel.nameBn : req.educationLevel.nameEn) : ''}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {(req.subjects || []).map((s) => (isBn ? s.nameBn : s.nameEn)).join(', ')} •{' '}
                        <span className="capitalize">{req.learningMode.replace('_', ' ')}</span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelTuition(req.id)}
                          disabled={isCancelling}
                          className="text-destructive hover:bg-destructive/10 text-xs"
                        >
                          {isBn ? 'বাতিল করুন' : 'Cancel Request'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5">
                    {/* Request Snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-muted/20 border border-border/50 text-muted-foreground">
                      <div>
                        <span className="block text-[11px] text-muted-foreground">{isBn ? 'পদ্ধতি ও এলাকা:' : 'Mode & Area:'}</span>
                        <span className="font-semibold text-foreground">
                          {req.learningMode === 'online'
                            ? isBn
                              ? 'অনলাইন'
                              : 'Online'
                            : `${req.area || ''}, ${req.district}`}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">{isBn ? 'শিডিউল:' : 'Schedule:'}</span>
                        <span className="font-semibold text-foreground">
                          {req.daysPerWeek} {isBn ? 'দিন/সপ্তাহ' : 'days/wk'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">{isBn ? 'সম্মানী বাজেট:' : 'Budget Offer:'}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳ {req.salaryBudgetMin} - ৳ {req.salaryBudgetMax}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-muted-foreground">{isBn ? 'শিক্ষক জেন্ডার:' : 'Tutor Gender:'}</span>
                        <span className="font-semibold text-foreground capitalize">{req.preferredTutorGender}</span>
                      </div>
                    </div>

                    {/* Section: Admin Curated Tutor Suggestions */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {isBn ? 'অগ্রণী অ্যাডমিন প্রস্তাবিত শিক্ষকগণ (Curated Matches)' : 'Admin Recommended Tutors'}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {(req.suggestions || []).length} {isBn ? 'জন প্রস্তাবিত' : 'suggested'}
                        </span>
                      </div>

                      {(req.suggestions || []).length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10 text-center text-xs text-muted-foreground">
                          <Clock className="w-4 h-4 mx-auto mb-1 text-primary animate-spin" />
                          <p>
                            {isBn
                              ? 'আমাদের টিম বর্তমানে সেরা টিউটর যাচাই করছে। দ্রুতই প্রস্তাবিত শিক্ষকের প্রোফাইল এখানে দেখতে পাবেন।'
                              : 'Our academic team is evaluating top tutor profiles. Suggestions will appear here shortly.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(req.suggestions || []).map((sug) => {
                            const tutor = sug.tutorProfile;
                            return (
                              <div
                                key={sug.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  sug.status === 'confirmed' || sug.status === 'accepted_by_guardian'
                                    ? 'border-emerald-500 bg-emerald-500/5'
                                    : sug.status === 'declined_by_guardian'
                                    ? 'border-border/40 bg-muted/10 opacity-60'
                                    : 'border-primary/30 bg-card hover:border-primary shadow-xs'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                                      {tutor?.user?.displayName?.charAt(0) || 'T'}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-sm text-foreground">
                                        {tutor?.user?.displayName || 'Verified Tutor'}
                                      </h5>
                                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                                        {tutor?.headlineEn || tutor?.headlineBn || 'Academic Specialist'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Match Score Badge */}
                                  <div className="text-right shrink-0">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {sug.matchScore}% Match
                                    </span>
                                  </div>
                                </div>

                                {/* Admin Note */}
                                {sug.adminNote && (
                                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground mb-3 flex items-start gap-2">
                                    <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-bold text-primary block text-[10px] uppercase">
                                        {isBn ? 'অগ্রণী এডু রেকমেন্ডেশন:' : 'Ogroni Recommendation:'}
                                      </span>
                                      <p className="text-[11px]">{sug.adminNote}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                {sug.status === 'suggested' && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                                    <Button
                                      size="sm"
                                      onClick={() => handleRespond(sug.id, 'accept')}
                                      disabled={isResponding}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                      {isBn ? 'শিক্ষক নির্বাচন ও নিশ্চিত করুন' : 'Confirm & Hire Tutor'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRespond(sug.id, 'decline')}
                                      disabled={isResponding}
                                      className="text-xs font-semibold hover:bg-destructive/10 text-destructive border-destructive/30"
                                    >
                                      {isBn ? 'অন্য শিক্ষক প্রয়োজন' : 'Request Other'}
                                    </Button>
                                  </div>
                                )}

                                {(sug.status === 'accepted_by_guardian' || sug.status === 'confirmed') && (
                                  <div className="pt-2 border-t border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{isBn ? 'শিক্ষক নিশ্চিত ও টিউশন চূড়ান্ত হয়েছে' : 'Tutor Confirmed & Finalized'}</span>
                                  </div>
                                )}

                                {sug.status === 'declined_by_guardian' && (
                                  <div className="pt-2 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span>{isBn ? 'অন্য শিক্ষক খোঁজা হচ্ছে' : 'Alternative Requested'}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CONFIRMED BOOKING CONTRACTS & HISTORY                              */}
        {/* ========================================================================= */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              <button
                onClick={() => setBookingFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bookingFilter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted/40 text-foreground hover:bg-muted border border-border'
                }`}
              >
                <span>{isBn ? 'সকল বুকিং' : 'All Bookings'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-foreground">
                  {bookingCounts.all}
                </span>
              </button>
              <button
                onClick={() => setBookingFilter('requested')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bookingFilter === 'requested'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                }`}
              >
                <span>{isBn ? 'বিবেচনাধীন' : 'Pending'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                  {bookingCounts.requested}
                </span>
              </button>
              <button
                onClick={() => setBookingFilter('accepted')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bookingFilter === 'accepted'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300'
                }`}
              >
                <span>{isBn ? 'নিশ্চিত / সক্রিয়' : 'Confirmed'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-950">
                  {bookingCounts.accepted}
                </span>
              </button>
              <button
                onClick={() => setBookingFilter('disputed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bookingFilter === 'disputed'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-950 hover:bg-red-100 border border-red-300'
                }`}
              >
                <span>{isBn ? 'বিরোধ / রিপ্লেসমেন্ট' : 'Disputed'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-200 text-red-950">
                  {bookingCounts.disputed}
                </span>
              </button>
              <button
                onClick={() => setBookingFilter('closed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bookingFilter === 'closed'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <span>{isBn ? 'বাতিল / শেষ' : 'Closed'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-900">
                  {bookingCounts.closed}
                </span>
              </button>
            </div>

            {bookingReq.isLoading ? (
              <div className="py-16 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredBookings.length === 0 ? (
              <EmptyState
                title={isBn ? 'এই ক্যাটাগরিতে কোনো বুকিং চুক্তি নেই' : 'No Bookings in this Category'}
                description={
                  isBn
                    ? 'প্রস্তাবিত শিক্ষক নিশ্চিত করলে আপনার কনফার্মড চুক্তি ও সেশন শিডিউল এখানে জমা হবে।'
                    : 'When you accept an admin tutor suggestion, confirmed contracts will appear here.'
                }
                actionLabel={isBn ? 'নতুন রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
                actionHref={withLocale('/request-tutor', locale)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBookings.map((r: BookingRequestItem) => {
                  const tutorUser = r.tutorProfile?.user;
                  const tutorName = tutorUser?.displayName || tutorUser?.fullName || (isBn ? 'শিক্ষক' : 'Tutor');
                  const subjectTitle =
                    isBn && r.subject?.nameBn
                      ? r.subject.nameBn
                      : r.subject?.name || (isBn ? 'সাধারণ বিষয়' : 'General Subject');
                  const levelTitle =
                    isBn && r.educationLevel?.nameBn ? r.educationLevel.nameBn : r.educationLevel?.name || '';
                  const rateFormatted = r.pricePerSessionMinor
                    ? formatBDTMinor(Number(r.pricePerSessionMinor), locale)
                    : null;

                  return (
                    <Card
                      key={r.id}
                      className="flex flex-col justify-between bg-card border border-border hover:border-primary/50 text-foreground transition-colors rounded-xl overflow-hidden"
                    >
                      <CardHeader className="flex flex-col gap-3 pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                            ID: #{r.id.slice(0, 8)}
                          </span>
                          {getBookingStatusBadge(r.status)}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                              {isBn ? `শিক্ষক: ${tutorName}` : `Tutor: ${tutorName}`}
                            </h3>
                            {r.tutorProfile?.headline && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {r.tutorProfile.headline}
                              </p>
                            )}
                          </div>
                          {rateFormatted && (
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-foreground font-mono">
                                {rateFormatted}
                              </span>
                              <span className="block text-[10px] font-bold text-muted-foreground">
                                {isBn ? '/সেশন' : '/session'}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="flex flex-col gap-3 text-xs pt-0 flex-1">
                        <div className="flex flex-wrap gap-2 text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            {subjectTitle} {levelTitle ? `(${levelTitle})` : ''}
                          </span>
                        </div>

                        {r.createdAt && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>{formatWeekdayDate(r.createdAt, locale)}</span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="pt-3 border-t border-border flex items-center justify-between gap-2 bg-muted/10">
                        {r.status === 'awaiting_payment' ? (
                          <Link href={withLocale(paymentsHref, locale)} className="w-full">
                            <Button size="sm" className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              {isBn ? 'পেমেন্ট সম্পন্ন করুন' : 'Complete Escrow Payment'}
                            </Button>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <Link href={withLocale(messagesHref, locale)} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full font-bold text-xs">
                                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                {isBn ? 'বার্তা দিন' : 'Message'}
                              </Button>
                            </Link>
                            <Link href={withLocale(`${replacementsHref}?bookingId=${r.id}`, locale)} className="shrink-0">
                              <Button size="sm" variant="ghost" className="font-semibold text-xs text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400">
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" />
                                {isBn ? 'রিপ্লেসমেন্ট' : 'Replace'}
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export function GuardianRequestsHubPage(props: { locale: Locale }) {
  return <RequestsHubPage {...props} role="guardian" />;
}
