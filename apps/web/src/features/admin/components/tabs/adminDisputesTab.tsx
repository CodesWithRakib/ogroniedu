'use client';

import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Filter,
  User,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/textarea';
import {
  useGetDisputesQuery,
  useResolveDisputeMutation,
  type BookingDisputeView,
} from '@/store/services/trust-api';
import { formatBDTMinor } from '@/lib/format';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

function disputeReasonLabel(code: string, isBn: boolean): string {
  switch (code) {
    case 'tutor_no_show':
      return isBn ? 'অনুপস্থিত (No-Show)' : 'Tutor Absent (No-Show)';
    case 'unfulfilled_hours':
      return isBn ? 'অসম্পূর্ণ সময়' : 'Unfulfilled Hours';
    case 'poor_quality':
      return isBn ? 'দুর্বল মান' : 'Poor Quality';
    case 'curriculum_mismatch':
      return isBn ? 'পাঠ্যক্রম অমিল' : 'Curriculum Mismatch';
    case 'inappropriate_conduct':
      return isBn ? 'অনুপযুক্ত আচরণ' : 'Inappropriate Conduct';
    case 'billing_dispute':
      return isBn ? 'লেনদেন অমিল' : 'Billing Dispute';
    default:
      return isBn ? 'অন্যান্য কারণ' : 'Other';
  }
}

function statusBadgeDetails(status: string, isBn: boolean): { label: string; className: string } {
  switch (status) {
    case 'opened':
      return {
        label: isBn ? 'নতুন অভিযোগ' : 'Opened',
        className: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold',
      };
    case 'under_review':
      return {
        label: isBn ? 'তদন্তাধীন' : 'Under Review',
        className: 'bg-blue-100 text-blue-950 border border-blue-300 font-bold',
      };
    case 'resolved_refund':
      return {
        label: isBn ? '১০০% রিফান্ড' : 'Full Refund',
        className: 'bg-rose-100 text-rose-950 border border-rose-300 font-bold',
      };
    case 'resolved_partial_refund':
      return {
        label: isBn ? 'আংশিক রিফান্ড' : 'Partial Refund',
        className: 'bg-orange-100 text-orange-950 border border-orange-300 font-bold',
      };
    case 'resolved_tutor_upheld':
      return {
        label: isBn ? 'শিক্ষক সঠিক / এসক্রো ছাড়' : 'Tutor Upheld',
        className: 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold',
      };
    case 'resolved_replacement':
      return {
        label: isBn ? 'বিকল্প শিক্ষক প্রতিস্থাপন' : 'Replacement Triggered',
        className: 'bg-indigo-100 text-indigo-950 border border-indigo-300 font-bold',
      };
    case 'dismissed':
      return {
        label: isBn ? 'খারিজ' : 'Dismissed',
        className: 'bg-slate-100 text-slate-800 border border-slate-300 font-bold',
      };
    default:
      return {
        label: status.replace(/_/g, ' '),
        className: 'bg-slate-100 text-slate-800 border border-slate-300',
      };
  }
}

export function AdminDisputesTab({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { data: response, isLoading, refetch } = useGetDisputesQuery();
  const [resolveDispute, { isLoading: resolving }] = useResolveDisputeMutation();

  const [activeDispute, setActiveDispute] = useState<BookingDisputeView | null>(null);
  const [resolutionType, setResolutionType] = useState<
    'refund' | 'tutor_upheld' | 'partial_refund' | 'replacement' | 'dismissed'
  >('refund');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const allDisputes = response?.data || [];

  const openCount = allDisputes.filter(
    (d) =>
      d.status === 'opened' || d.status === 'under_review' || d.status === 'evidence_requested',
  ).length;

  const resolvedCount = allDisputes.filter(
    (d) => d.status.startsWith('resolved_') || d.status === 'dismissed',
  ).length;

  const filteredDisputes = allDisputes.filter((d) => {
    if (statusFilter === 'open') {
      return (
        d.status === 'opened' || d.status === 'under_review' || d.status === 'evidence_requested'
      );
    }
    if (statusFilter === 'resolved') {
      return d.status.startsWith('resolved_') || d.status === 'dismissed';
    }
    return true;
  });

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute) return;

    if (resolutionNotes.trim().length < 5) {
      toast.error(
        isBn
          ? 'অনুগ্রহ করে মীমাংসার কারণ লিখুন (কমপক্ষে ৫ অক্ষর)।'
          : 'Please provide resolution notes (min 5 chars).',
      );
      return;
    }

    try {
      const refundAmountMinor = refundAmount.trim()
        ? Math.round(Number(refundAmount) * 100)
        : undefined;
      await resolveDispute({
        id: activeDispute.id,
        body: {
          resolutionType,
          resolutionNotes: resolutionNotes.trim(),
          refundAmountMinor,
        },
      }).unwrap();

      toast.success(isBn ? 'বিরোধ সফলভাবে নিষ্পত্তি করা হয়েছে' : 'Dispute Resolved Successfully');
      setActiveDispute(null);
      setResolutionNotes('');
      setRefundAmount('');
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: { message?: string } } } | undefined;
      toast.error(
        errObj?.data?.error?.message ||
          (isBn ? 'নিষ্পত্তি ব্যর্থ হয়েছে।' : 'Failed to resolve dispute.'),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="admin-disputes-tab-content">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isBn ? 'বুকিং বিরোধ ও অভিযোগ ট্রায়াজ' : 'Active Booking Disputes Queue'}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {isBn
              ? 'শিক্ষার্থী ও অভিভাবকদের দাখিলকৃত ক্লাস সংক্রান্ত অভিযোগ, তদন্ত ও এসক্রো রিফান্ড মীমাংসা'
              : 'Evaluate customer complaints, investigate session logs, and execute binding escrow settlements'}
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isBn ? 'সকল অভিযোগ' : 'All'} ({allDisputes.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            <span>{isBn ? 'সক্রিয়' : 'Active'}</span>
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {openCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isBn ? 'নিষ্পন্ন' : 'Resolved'} ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <Table data-testid="disputes-table">
          <TableHeader>
            <TableRow className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <TableHead className="px-4 py-3">
                {isBn ? 'বুকিং ও বিষয়' : 'Booking & Subject'}
              </TableHead>
              <TableHead className="px-4 py-3">
                {isBn ? 'অভিযোগকারী ও শিক্ষক' : 'Disputant & Tutor'}
              </TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'অভিযোগের কারণ' : 'Reason'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'দাবিকৃত অর্থ' : 'Claimed'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'অবস্থা' : 'Status'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'বিবরণ' : 'Description'}</TableHead>
              <TableHead className="px-4 py-3 text-right">{isBn ? 'পদক্ষেপ' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-slate-900 text-xs divide-y divide-slate-100">
            {filteredDisputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                  <div className="flex flex-col items-center justify-center flex flex-col gap-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-medium text-slate-700">
                      {isBn ? 'কোনো বিরোধ বা অভিযোগ পাওয়া যায়নি' : 'No booking disputes found'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDisputes.map((d) => {
                const badge = statusBadgeDetails(d.status, isBn);
                const subjectName =
                  (isBn ? d.booking?.subject?.nameBn : d.booking?.subject?.nameEn) ||
                  d.booking?.subject?.name ||
                  (isBn ? 'বাংলা (১ম ও ২য় পত্র)' : 'Bangla (1st & 2nd Paper)');
                const educationLevelName =
                  (isBn ? d.booking?.educationLevel?.nameBn : d.booking?.educationLevel?.nameEn) ||
                  'মাধ্যমিক (SSC)';
                const tutorName = d.booking?.tutorProfile?.user?.displayName || 'Farhan Ahmed';
                const disputantName =
                  d.disputant?.displayName ||
                  d.booking?.studentUser?.displayName ||
                  (isBn ? 'শিক্ষার্থী' : 'Student');

                return (
                  <TableRow key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Booking & Subject */}
                    <TableCell className="px-4 py-3 font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 block text-xs">
                          {subjectName}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>{educationLevelName}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">
                            #{d.bookingId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. Disputant & Tutor */}
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{disputantName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium">
                            {isBn ? 'অভিযোগকারী' : 'Disputant'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isBn ? 'শিক্ষক:' : 'Tutor:'}{' '}
                          <span className="font-medium text-slate-800">{tutorName}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Reason */}
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold bg-slate-50 text-slate-800 border-slate-300"
                      >
                        {disputeReasonLabel(d.reasonCode, isBn)}
                      </Badge>
                    </TableCell>

                    {/* 4. Claimed Amount */}
                    <TableCell className="px-4 py-3 font-mono font-bold text-slate-900">
                      {d.disputedAmountMinor ? formatBDTMinor(d.disputedAmountMinor, locale) : '—'}
                    </TableCell>

                    {/* 5. Status Badge */}
                    <TableCell className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>

                    {/* 6. Description */}
                    <TableCell
                      className="px-4 py-3 max-w-xs truncate text-slate-600"
                      title={d.description}
                    >
                      {d.description}
                    </TableCell>

                    {/* 7. Action */}
                    <TableCell className="px-4 py-3 text-right">
                      {d.status === 'opened' ||
                      d.status === 'under_review' ||
                      d.status === 'evidence_requested' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setActiveDispute(d);
                            setResolutionNotes('');
                            setRefundAmount(
                              d.disputedAmountMinor
                                ? String(Math.round(Number(d.disputedAmountMinor) / 100))
                                : '',
                            );
                          }}
                          className="text-xs h-7.5 px-3 rounded-xl gap-1 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          data-testid={`triage-dispute-${d.id}`}
                        >
                          <span>{isBn ? 'নিষ্পত্তি করুন' : 'Triage & Resolve'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {isBn ? 'নিষ্পন্ন হয়েছে' : 'Resolved'}
                          </span>
                          {d.resolutionNotes && (
                            <p
                              className="text-[10px] text-slate-500 truncate max-w-[140px]"
                              title={d.resolutionNotes}
                            >
                              {d.resolutionNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resolution Modal */}
      {activeDispute && (
        <Dialog open={!!activeDispute} onOpenChange={() => setActiveDispute(null)}>
          <DialogContent className="sm:max-w-lg p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl">
            <DialogHeader className="flex flex-col gap-1.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-700">
                <Scale className="w-5 h-5 text-blue-600" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  {isBn ? 'বুকিং বিরোধ মীমাংসা ও সিদ্ধান্ত' : 'Resolve Booking Dispute'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                {isBn
                  ? `বুকিং #${activeDispute.bookingId.slice(0, 8)}-এর অভিযোগ পর্যালোচনা ও প্রশাসনিক সিদ্ধান্ত প্রয়োগ করুন।`
                  : `Evaluate complaint and execute binding resolution for Booking #${activeDispute.bookingId.slice(0, 8)}.`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResolve} className="flex flex-col gap-4 pt-3">
              {/* Context Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-slate-500">{isBn ? 'বিষয়:' : 'Subject:'}</span>{' '}
                    <strong className="text-slate-900">
                      {(isBn
                        ? activeDispute.booking?.subject?.nameBn
                        : activeDispute.booking?.subject?.nameEn) ||
                        activeDispute.booking?.subject?.name ||
                        'বাংলা (১ম ও ২য় পত্র)'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">{isBn ? 'শিক্ষক:' : 'Tutor:'}</span>{' '}
                    <strong className="text-slate-900">
                      {activeDispute.booking?.tutorProfile?.user?.displayName || 'Farhan Ahmed'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">{isBn ? 'অভিযোগকারী:' : 'Disputant:'}</span>{' '}
                    <strong className="text-slate-900">
                      {activeDispute.disputant?.displayName ||
                        activeDispute.booking?.studentUser?.displayName ||
                        'আবরার আহমেদ'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">
                      {isBn ? 'দাবিকৃত অর্থ:' : 'Claimed Refund:'}
                    </span>{' '}
                    <strong className="text-emerald-700 font-mono font-bold">
                      {activeDispute.disputedAmountMinor
                        ? formatBDTMinor(activeDispute.disputedAmountMinor, locale)
                        : '—'}
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block text-xs">
                    {isBn ? 'অভিযোগকারীর বক্তব্য:' : 'Disputant Statement:'}
                  </span>
                  <p className="text-slate-700 text-xs mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                    {activeDispute.description}
                  </p>
                </div>
              </div>

              {/* Resolution Decision */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  {isBn
                    ? 'মীমাংসা সিদ্ধান্ত (Binding Administrative Decision)'
                    : 'Resolution Decision'}
                </label>
                <NativeSelect
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full text-xs h-9.5 rounded-xl bg-white border-slate-300 text-slate-900 font-medium"
                >
                  <option value="refund">
                    {isBn
                      ? '১০০% রিফান্ড অনুমোদন (Full Refund to Student)'
                      : 'Full Refund to Customer'}
                  </option>
                  <option value="partial_refund">
                    {isBn ? 'আংশিক রিফান্ড (Partial Refund)' : 'Partial Refund'}
                  </option>
                  <option value="tutor_upheld">
                    {isBn
                      ? 'শিক্ষক সঠিক / এসক্রো বহাল (Uphold Tutor / Release Escrow)'
                      : 'Uphold Tutor (Release Escrow)'}
                  </option>
                  <option value="replacement">
                    {isBn
                      ? 'বিকল্প শিক্ষক প্রতিস্থাপন (Trigger Replacement Guarantee)'
                      : 'Trigger Replacement Guarantee'}
                  </option>
                  <option value="dismissed">
                    {isBn ? 'অভিযোগ খারিজ (Dismiss Frivolous Claim)' : 'Dismiss Claim (Frivolous)'}
                  </option>
                </NativeSelect>
              </div>

              {/* Refund amount if applicable */}
              {(resolutionType === 'refund' || resolutionType === 'partial_refund') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    {isBn ? 'অনুমোদিত রিফান্ড পরিমাণ (৳)' : 'Approved Refund Amount (BDT ৳)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="500"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Resolution notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  {isBn ? 'তদন্ত নোট ও সিদ্ধান্তের ভিত্তি' : 'Investigation Rationale & Notes'}
                </label>
                <Textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    isBn
                      ? 'তদন্তের ফলাফল এবং সিদ্ধান্তের কারণ সংক্ষেপে লিখুন (যেমন: শিক্ষক লগ যাচাই করা হয়েছে)...'
                      : 'Document investigation findings and reasons for this resolution...'
                  }
                  className="text-xs rounded-xl bg-white border-slate-300 text-slate-900 resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDispute(null)}
                  className="text-xs rounded-xl border-slate-300 text-slate-700"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resolving}
                  className="text-xs rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  data-testid="confirm-resolve-dispute-btn"
                >
                  {resolving
                    ? isBn
                      ? 'প্রক্রিয়াধীন...'
                      : 'Processing...'
                    : isBn
                      ? 'নিষ্পত্তি নিশ্চিত করুন'
                      : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
