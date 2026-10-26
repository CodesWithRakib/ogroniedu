'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  User,
  GraduationCap,
  Receipt,
  Play,
  Check,
  Copy,
  Video,
  MapPin,
  ExternalLink,
  RefreshCw,
  Scale,
  UserCheck,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Alert,
  AlertDescription,
  LoadingSpinner,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  StatusBadge,
} from '@/components/ui';
import { formatDateTime, formatBDTMinor } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import {
  useGetAdminBookingDetailQuery,
  useAdminCancelBookingMutation,
} from '@/store/services/admin-api';
import { useSettleMilestoneMutation } from '@/store/services/payments-api';
import { useStartSessionMutation, useCompleteSessionMutation } from '@/store/services/sessions-api';
import { AdminCancelBookingModal } from '../components/modals/adminCancelBookingModal';

type DetailTab = 'overview' | 'sessions' | 'financials' | 'governance';

export function AdminBookingDetailPage({
  locale,
  bookingId,
}: {
  locale: Locale;
  bookingId: string;
}) {
  const isBn = locale === 'bn';
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [copiedId, setCopiedId] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundChecked, setRefundChecked] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useGetAdminBookingDetailQuery(bookingId);
  const [cancelBooking, { isLoading: isCancelling }] = useAdminCancelBookingMutation();
  const [settleMilestone, { isLoading: isSettling }] = useSettleMilestoneMutation();
  const [startSession, { isLoading: isStartingSession }] = useStartSessionMutation();
  const [completeSession, { isLoading: isCompletingSession }] = useCompleteSessionMutation();

  const detail = data?.data;
  const booking = detail?.booking;
  const sessions = detail?.sessions ?? [];
  const escrowHolds = detail?.escrowHolds ?? [];
  const paymentOrders = detail?.paymentOrders ?? [];
  const invoices = detail?.invoices ?? [];
  const journals = detail?.journals ?? [];
  const refunds = detail?.refunds ?? [];
  const replacementCase = detail?.replacementCase;
  const dispute = detail?.dispute;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!booking || !cancelReason.trim()) return;
    try {
      setActionError(null);
      await cancelBooking({
        id: booking.id,
        reason: cancelReason.trim(),
        refundStudent: refundChecked,
      }).unwrap();
      setActionSuccess(
        isBn
          ? 'বুকিং সফলভাবে বাতিল এবং রিফান্ড নির্দেশ কার্যকর করা হয়েছে।'
          : 'Booking cancelled and refund instruction processed successfully.',
      );
      setCancelModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(
        e.data?.message || (isBn ? 'বাতিলকরণে ত্রুটি হয়েছে।' : 'Failed to cancel booking.'),
      );
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      setActionError(null);
      await startSession(sessionId).unwrap();
      setActionSuccess(isBn ? 'সেশন শুরু হয়েছে।' : 'Session started successfully.');
      refetch();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(
        e.data?.message || (isBn ? 'সেশন শুরু করতে ব্যর্থ।' : 'Failed to start session.'),
      );
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      setActionError(null);
      await completeSession({
        id: sessionId,
        notes: 'Completed via Admin Inspection Control',
      }).unwrap();
      setActionSuccess(
        isBn ? 'সেশন সফলভাবে সম্পন্ন মার্ক করা হয়েছে।' : 'Session marked as completed.',
      );
      refetch();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(
        e.data?.message || (isBn ? 'সেশন সম্পন্ন করতে ব্যর্থ।' : 'Failed to complete session.'),
      );
    }
  };

  const handleSettleMilestone = async (sessionId: string) => {
    try {
      setActionError(null);
      await settleMilestone({ sessionId }).unwrap();
      setActionSuccess(
        isBn
          ? 'মাইালস্টোন সেটেলমেন্ট সফল! ফান্ড টিউটরের পেয়াবল অ্যাকাউন্টে জমা হয়েছে।'
          : 'Milestone settled successfully! Funds transferred to Tutor Payable account.',
      );
      refetch();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setActionError(
        e.data?.message || (isBn ? 'সেটেলমেন্ট ব্যর্থ হয়েছে।' : 'Milestone settlement failed.'),
      );
    }
  };

  if (isLoading) {
    return (
      <AdminLayout locale={locale}>
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner className="w-8 h-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            {isBn ? 'বুকিং বিস্তারিত লোড হচ্ছে...' : 'Loading booking dossier...'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (isError || !booking) {
    return (
      <AdminLayout locale={locale}>
        <div className="space-y-6 py-8">
          <Link
            href={`/${locale}/dashboard/admin/bookings`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'বুকিংস তালিকায় ফিরে যান' : 'Back to Bookings'}</span>
          </Link>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {isBn
                ? 'বুকিং তথ্য পাওয়া যায়নি বা লোড করতে ত্রুটি হয়েছে।'
                : 'Booking dossier not found or failed to load.'}
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  const tutorUser = booking.tutorProfile?.user;
  const studentUser = booking.studentUser;
  const requesterUser = booking.requesterUser;
  const priceBdt = booking.pricePerSessionMinor ? Number(booking.pricePerSessionMinor) / 100 : 0;
  const isEscrowHeld =
    escrowHolds.some(
      (h: { status?: string }) => h.status === 'held' || h.status === 'partially_released',
    ) ||
    booking.escrowStatus === 'held' ||
    (!booking.escrowStatus && (booking.status === 'confirmed' || booking.status === 'completed'));

  return (
    <AdminLayout locale={locale}>
      <div className="space-y-6 py-6 w-full" data-testid="admin-booking-detail-page">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/dashboard/admin/bookings`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'বুকিংস তালিকায় ফিরে যান' : 'Back to Bookings'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {actionSuccess && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="font-medium">{actionSuccess}</AlertDescription>
          </Alert>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="font-medium">{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Header Hero Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground flex items-center gap-1.5">
                  ID: {booking.id.substring(0, 13)}...
                  <button
                    onClick={() => copyToClipboard(booking.id)}
                    className="hover:text-foreground transition-colors"
                    title={isBn ? 'কপি করুন' : 'Copy Full ID'}
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
                <StatusBadge status={booking.status} size="sm" />
                {isEscrowHeld ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs py-0.5"
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {isBn ? 'এসক্রো ফান্ড সংরক্ষিত' : 'Escrow Held'}
                  </Badge>
                ) : booking.escrowStatus === 'released' ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs py-0.5"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {isBn ? 'এসক্রো রিলিজড' : 'Escrow Released'}
                  </Badge>
                ) : booking.escrowStatus === 'refunded' ? (
                  <Badge
                    variant="outline"
                    className="border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs py-0.5"
                  >
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {isBn ? 'এসক্রো রিফান্ডেড' : 'Escrow Refunded'}
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="text-xs py-0.5">
                  {booking.mode === 'online' ? (
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" /> {isBn ? 'অনলাইন ক্লাস' : 'Online Class'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {isBn ? 'সরাসরি টিউশন' : 'In-Person'}
                    </span>
                  )}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {booking.subject?.nameBn ||
                  booking.subject?.name ||
                  (isBn ? 'সাধারণ পাঠদান' : 'General Tutoring')}
                {booking.educationLevel && (
                  <span className="text-muted-foreground font-normal text-lg sm:text-xl ml-2">
                    • {booking.educationLevel.nameBn || booking.educationLevel.name}
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isBn ? 'বুকিং তৈরির সময়: ' : 'Booking Created: '}
                <span className="font-medium text-foreground">
                  {formatDateTime(booking.createdAt, locale)}
                </span>
              </p>
            </div>

            {/* Quick Financial Overview & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-muted/50 rounded-xl p-3 border border-border text-right px-4">
                <span className="text-xs text-muted-foreground block font-medium">
                  {isBn ? 'সেশন মূল্য' : 'Per Session Fee'}
                </span>
                <span className="text-2xl font-black font-mono text-foreground">
                  ৳{priceBdt.toLocaleString()}
                </span>
              </div>
              {booking.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelModalOpen(true)}
                  className="rounded-xl font-medium shadow-xs"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  {isBn ? 'বাতিল ও রিফান্ড' : 'Cancel & Refund'}
                </Button>
              )}
            </div>
          </div>

          {/* KPI Mini-Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
            <div>
              <span className="text-xs text-muted-foreground">
                {isBn ? 'মোট ক্লাস সেশন' : 'Total Sessions'}
              </span>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                {sessions.length || 1}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {isBn ? 'সম্পন্ন সেশন' : 'Completed Sessions'}
              </span>
              <p className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                {sessions.filter((s: { status: string }) => s.status === 'completed').length}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {isBn ? 'এসক্রো রিজার্ভ' : 'Escrow Reserved'}
              </span>
              <p className="text-lg font-bold font-mono text-amber-600 mt-0.5">
                ৳
                {(escrowHolds[0]
                  ? Number(escrowHolds[0].amountMinor) / 100
                  : priceBdt
                ).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                {isBn ? 'লেজার এন্ট্রি' : 'Ledger Entries'}
              </span>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                {journals.reduce(
                  (acc: number, j: { entries?: unknown[] }) => acc + (j.entries?.length || 0),
                  0,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="rounded-lg text-xs font-semibold gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>{isBn ? 'অংশগ্রহণকারী ও বিবরণ' : 'Overview & Participants'}</span>
          </Button>
          <Button
            variant={activeTab === 'sessions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('sessions')}
            className="rounded-lg text-xs font-semibold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isBn ? 'ক্লাস সেশনসমূহ' : 'Class Sessions'}</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
              {sessions.length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === 'financials' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('financials')}
            className="rounded-lg text-xs font-semibold gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{isBn ? 'এসক্রো ও লেজার অডিট' : 'Escrow & Ledger Audit'}</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
              {escrowHolds.length + journals.length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === 'governance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('governance')}
            className="rounded-lg text-xs font-semibold gap-1.5"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isBn ? 'রিপ্লেসমেন্ট ও ডিসপিউট' : 'Replacement & Disputes'}</span>
            {(replacementCase || dispute || refunds.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
            )}
          </Button>
        </div>

        {/* TAB 1: OVERVIEW & PARTICIPANTS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Dossier Card */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        {isBn ? 'শিক্ষার্থী তথ্য' : 'Student Dossier'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isBn
                          ? 'বুকিং গ্রহণকারী শিক্ষার্থী'
                          : 'Registered Student for this Booking'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {studentUser?.status || 'Active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'নাম' : 'Display Name'}
                  </span>
                  <p className="font-semibold text-foreground">
                    {studentUser?.displayName || studentUser?.fullName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'ইমেইল' : 'Email Address'}
                  </span>
                  <p className="font-mono text-xs text-foreground">{studentUser?.email || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  </span>
                  <p className="font-mono text-xs text-foreground">
                    {studentUser?.phoneE164 || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'ইউজার আইডি' : 'User UUID'}
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">
                    {studentUser?.id || booking.studentUserId}
                  </p>
                </div>
                {requesterUser && requesterUser.id !== studentUser?.id && (
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-xs text-muted-foreground block">
                      {isBn ? 'অনুরোধকারী / অভিভাবক' : 'Requester / Guardian'}
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      {requesterUser.displayName} ({requesterUser.email})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tutor Dossier Card */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        {isBn ? 'টিউটর তথ্য' : 'Assigned Tutor Dossier'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isBn ? 'যাচাইকৃত পেশাদার শিক্ষক' : 'Verified Tutor Profile'}
                      </CardDescription>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/dashboard/admin/verification/${booking.tutorUserId}`}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <span>{isBn ? 'ভেরিফিকেশন দেখুন' : 'View Verification'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'নাম' : 'Display Name'}
                  </span>
                  <p className="font-semibold text-foreground">
                    {tutorUser?.displayName || tutorUser?.fullName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'হেডলাইন' : 'Professional Headline'}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {booking.tutorProfile?.headline || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'ইমেইল' : 'Email Address'}
                  </span>
                  <p className="font-mono text-xs text-foreground">{tutorUser?.email || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  </span>
                  <p className="font-mono text-xs text-foreground">{tutorUser?.phoneE164 || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'টিউটর আইডি' : 'Tutor User UUID'}
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">
                    {booking.tutorUserId}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Class Specifications Card */}
            <Card className="rounded-2xl shadow-xs md:col-span-2">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold">
                  {isBn ? 'টিউশন ও ক্লাস স্পেসিফিকেশন' : 'Class Specifications & Logistics'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'মাধ্যম' : 'Delivery Mode'}
                  </span>
                  <p className="font-medium text-foreground capitalize mt-0.5">{booking.mode}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'বিষয়' : 'Subject'}
                  </span>
                  <p className="font-medium text-foreground mt-0.5">
                    {booking.subject?.nameBn || booking.subject?.name || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'স্তর' : 'Education Level'}
                  </span>
                  <p className="font-medium text-foreground mt-0.5">
                    {booking.educationLevel?.nameBn || booking.educationLevel?.name || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'সেশন ফি (মাইনর)' : 'Price Minor'}
                  </span>
                  <p className="font-mono text-xs text-foreground mt-0.5">
                    {booking.pricePerSessionMinor} poisha
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'বুকিং স্থিতি' : 'Booking Status'}
                  </span>
                  <p className="font-medium text-foreground capitalize mt-0.5">{booking.status}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {isBn ? 'এসক্রো স্থিতি' : 'Escrow Status'}
                  </span>
                  <p className="font-medium text-foreground capitalize mt-0.5">
                    {booking.escrowStatus || 'None'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: CLASS SESSIONS TIMELINE */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'ক্লাস সেশন ও মাইালস্টোন তালিকা' : 'Class Sessions & Milestones'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'প্রতিটি সেশনের স্ট্যাটাস ট্র্যাক করুন এবং সম্পন্ন সেশনের ফান্ড সেটেল করুন'
                    : 'Track each scheduled session and settle escrow milestone upon completion'}
                </p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center text-muted-foreground">
                <p>{isBn ? 'কোনো সেশন শিডিউল করা হয়নি।' : 'No sessions scheduled yet.'}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sessions.map(
                  (
                    sess: {
                      id: string;
                      status: string;
                      startsAt: string;
                      endsAt: string;
                      meetingUrl?: string | null;
                      locationInstructions?: string | null;
                    },
                    idx: number,
                  ) => {
                    const isCompleted = sess.status === 'completed';
                    const isScheduled = sess.status === 'scheduled';
                    const isInProgress = sess.status === 'in_progress';

                    return (
                      <Card key={sess.id} className="rounded-2xl shadow-xs border border-border">
                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
                                #{idx + 1}
                              </span>
                              <StatusBadge
                                status={
                                  sess.status as
                                    'scheduled' | 'in_progress' | 'completed' | 'cancelled'
                                }
                                size="sm"
                              />
                              <span className="text-xs text-muted-foreground font-mono">
                                ID: {sess.id.substring(0, 8)}...
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {formatDateTime(sess.startsAt, locale)} -{' '}
                                {formatDateTime(sess.endsAt, locale)}
                              </span>
                            </p>
                            {sess.meetingUrl && (
                              <p className="text-xs text-primary font-mono flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5" />
                                <a
                                  href={sess.meetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {sess.meetingUrl}
                                </a>
                              </p>
                            )}
                          </div>

                          {/* Session Operational Controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            {isScheduled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartSession(sess.id)}
                                disabled={isStartingSession}
                                className="text-xs h-8 gap-1.5"
                              >
                                <Play className="w-3 h-3 text-emerald-600" />
                                <span>{isBn ? 'সেশন শুরু করুন' : 'Start Session'}</span>
                              </Button>
                            )}
                            {(isScheduled || isInProgress) && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCompleteSession(sess.id)}
                                disabled={isCompletingSession}
                                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Check className="w-3 h-3" />
                                <span>{isBn ? 'সম্পন্ন মার্ক করুন' : 'Mark Completed'}</span>
                              </Button>
                            )}
                            {isCompleted && isEscrowHeld && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSettleMilestone(sess.id)}
                                disabled={isSettling}
                                className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{isBn ? 'মাইালস্টোন সেটেল করুন' : 'Settle Milestone'}</span>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  },
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCIALS & DOUBLE-ENTRY LEDGER */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Escrow Holds Card */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>
                    {isBn ? 'এসক্রো রিজার্ভ ও হোল্ড রেকর্ড' : 'Escrow Holds & Commission Snapshot'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] font-bold uppercase bg-muted/30">
                      <TableHead className="px-4 py-3">{isBn ? 'হোল্ড আইডি' : 'Hold ID'}</TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'সংরক্ষিত পরিমাণ' : 'Amount'}
                      </TableHead>
                      <TableHead className="px-4 py-3">{isBn ? 'রিলিজড' : 'Released'}</TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'কমিশন রেট' : 'Commission'}
                      </TableHead>
                      <TableHead className="px-4 py-3">{isBn ? 'স্থিতি' : 'Status'}</TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'হোল্ডের তারিখ' : 'Held At'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-border/50">
                    {escrowHolds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          {isBn ? 'কোনো এসক্রো রেকর্ড পাওয়া যায়নি' : 'No escrow records'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      escrowHolds.map(
                        (h: {
                          id: string;
                          amountMinor: string | number;
                          releasedMinor: string | number;
                          commissionRateBps: number;
                          status: string;
                          heldAt?: string;
                          createdAt?: string;
                        }) => (
                          <TableRow key={h.id}>
                            <TableCell className="px-4 py-3 font-mono text-[11px]">
                              {h.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="px-4 py-3 font-bold font-mono">
                              ৳{(Number(h.amountMinor) / 100).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-4 py-3 font-mono text-emerald-600">
                              ৳{(Number(h.releasedMinor || 0) / 100).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-4 py-3 font-mono">
                              {h.commissionRateBps / 100}% ({h.commissionRateBps} bps)
                            </TableCell>
                            <TableCell className="px-4 py-3 capitalize font-medium">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {h.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-muted-foreground">
                              {formatDateTime(h.heldAt || h.createdAt || '', locale)}
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Orders & Invoices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Orders */}
              <Card className="rounded-2xl shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>
                      {isBn
                        ? 'পেমেন্ট অর্ডার ও গেটওয়ে ট্রানজ্যাকশন'
                        : 'Payment Orders & Gateway Tx'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {paymentOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {isBn ? 'কোনো পেমেন্ট অর্ডার নেই' : 'No payment orders recorded'}
                    </p>
                  ) : (
                    paymentOrders.map(
                      (ord: {
                        id: string;
                        provider: string;
                        status: string;
                        amountMinor: string | number;
                        transactions?: Array<{
                          id: string;
                          providerTransactionId?: string;
                          status: string;
                        }>;
                      }) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-xl border border-border bg-muted/20 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs capitalize">
                              {ord.provider} Order
                            </span>
                            <StatusBadge
                              status={ord.status as 'confirmed' | 'completed' | 'requested'}
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Order ID: {ord.id.substring(0, 8)}...
                            </span>
                            <span className="font-bold font-mono">
                              ৳{(Number(ord.amountMinor) / 100).toLocaleString()}
                            </span>
                          </div>
                          {ord.transactions && ord.transactions.length > 0 && (
                            <div className="pt-2 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                              Trx ID:{' '}
                              {ord.transactions[0].providerTransactionId || ord.transactions[0].id}
                            </div>
                          )}
                        </div>
                      ),
                    )
                  )}
                </CardContent>
              </Card>

              {/* Official Invoices */}
              <Card className="rounded-2xl shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>{isBn ? 'অফিসিয়াল ইনভয়েস' : 'Official Invoices'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {invoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {isBn ? 'কোনো ইনভয়েস জারি করা হয়নি' : 'No invoices issued'}
                    </p>
                  ) : (
                    invoices.map(
                      (inv: {
                        id: string;
                        invoiceNumber?: string;
                        totalAmountMinor?: string | number;
                        totalMinor?: string | number;
                        status: string;
                        issuedAt?: string;
                      }) => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {inv.invoiceNumber || inv.id.substring(0, 10)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              {inv.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {formatDateTime(inv.issuedAt || '', locale)}
                            </span>
                            <span className="font-bold font-mono">
                              ৳
                              {(
                                Number(inv.totalMinor ?? inv.totalAmountMinor ?? 50000) / 100
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ),
                    )
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Double-Entry Ledger Journal Table */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <span>
                    {isBn
                      ? 'ডাবল-এন্ট্রি লেজার জার্নাল ও এন্ট্রি'
                      : 'Double-Entry Accounting Ledger'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'প্রতিটি লেনদেনের অডিট রেকর্ড (হোল্ড, সেটেলমেন্ট, পেয়াবল ও রেভিনিউ এন্ট্রি)'
                    : 'Immutable double-entry debit/credit ledger journals for this booking'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] font-bold uppercase bg-muted/30">
                      <TableHead className="px-4 py-3">{isBn ? 'তারিখ' : 'Posted At'}</TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'জার্নাল বিবরণ' : 'Description / Source'}
                      </TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'অ্যাকাউন্ট কোড' : 'Account'}
                      </TableHead>
                      <TableHead className="px-4 py-3">
                        {isBn ? 'ডেবিট / ক্রেডিট' : 'Direction'}
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right">
                        {isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-border/50">
                    {journals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          {isBn ? 'কোনো লেজার এন্ট্রি পাওয়া যায়নি' : 'No ledger entries found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      journals.flatMap(
                        (j: {
                          id: string;
                          postedAt?: string;
                          createdAt?: string;
                          description?: string;
                          sourceType?: string;
                          entries?: Array<{
                            id: string;
                            direction: 'debit' | 'credit';
                            amountMinor: string | number;
                            account?: { code: string; name: string };
                          }>;
                        }) =>
                          (j.entries || []).map((ent, eIdx) => (
                            <TableRow key={`${j.id}-${eIdx}`} className="hover:bg-muted/30">
                              <TableCell className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatDateTime(j.postedAt || j.createdAt || '', locale)}
                              </TableCell>
                              <TableCell className="px-4 py-2.5 font-medium text-foreground">
                                {j.description || j.sourceType}
                              </TableCell>
                              <TableCell className="px-4 py-2.5">
                                <span className="font-mono font-bold text-primary mr-1.5">
                                  {ent.account?.code || '—'}
                                </span>
                                <span className="text-muted-foreground text-[11px]">
                                  {ent.account?.name || ''}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                                    ent.direction === 'debit'
                                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  }`}
                                >
                                  {ent.direction}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-2.5 font-mono font-bold text-right">
                                ৳{(Number(ent.amountMinor) / 100).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )),
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: REPLACEMENT & DISPUTES */}
        {activeTab === 'governance' && (
          <div className="space-y-6">
            {/* Tutor Replacement Guarantee Case */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <span>
                      {isBn
                        ? 'টিউটর রিপ্লেসমেন্ট গ্যারান্টি কেস'
                        : 'Tutor Replacement Guarantee Case'}
                    </span>
                  </CardTitle>
                  {replacementCase && (
                    <Badge variant="outline" className="text-xs uppercase">
                      {replacementCase.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                {!replacementCase ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {isBn
                      ? 'এই বুকিংয়ে কোনো সক্রিয় রিপ্লেসমেন্ট কেস নেই।'
                      : 'No active replacement case filed for this booking.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          {isBn ? 'কেস আইডি' : 'Case ID'}
                        </span>
                        <p className="font-mono text-xs">{replacementCase.id}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          {isBn ? 'অনুরোধের কারণ' : 'Reason'}
                        </span>
                        <p className="font-medium">
                          {replacementCase.explanation ||
                            replacementCase.reasonCode ||
                            replacementCase.reason_code ||
                            replacementCase.reason ||
                            '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refunds Section */}
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-rose-500" />
                  <span>{isBn ? 'রিফান্ড রেকর্ডসমূহ' : 'Payment Refunds'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                {refunds.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {isBn ? 'কোনো রিফান্ড রেকর্ড নেই।' : 'No refund records found.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {refunds.map(
                      (r: {
                        id: string;
                        amountMinor: string | number;
                        status: string;
                        reason?: string;
                        createdAt?: string;
                      }) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-mono text-xs font-semibold">
                              {r.id.substring(0, 10)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.reason || 'Admin Intervention'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-rose-600 block">
                              ৳{(Number(r.amountMinor) / 100).toLocaleString()}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOpen && (
          <AdminCancelBookingModal
            booking={{
              id: booking.id,
              studentName: studentUser?.displayName || 'Student',
              tutorName: tutorUser?.displayName || 'Tutor',
              subjectName: booking.subject?.nameBn || booking.subject?.name || 'Subject',
              priceBdt,
              status: booking.status,
              mode: booking.mode,
            }}
            reason={cancelReason}
            refundEscrow={refundChecked}
            onReasonChange={setCancelReason}
            onRefundChange={setRefundChecked}
            onClose={() => setCancelModalOpen(false)}
            onConfirm={handleConfirmCancel}
          />
        )}
      </div>
    </AdminLayout>
  );
}
