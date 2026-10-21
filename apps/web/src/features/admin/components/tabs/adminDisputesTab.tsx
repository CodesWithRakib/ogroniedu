'use client';

import React, { useState } from 'react';
import { Scale, CheckCircle2, AlertCircle, XCircle, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
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
import { useGetDisputesQuery, useResolveDisputeMutation, type BookingDisputeView } from '@/store/services/trust-api';
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
      return isBn ? 'অন্যান্য' : 'Other';
  }
}

function statusVariant(status: string): 'warning' | 'destructive' | 'success' | 'info' | 'outline' {
  if (status === 'opened') return 'warning';
  if (status === 'under_review') return 'info';
  if (status === 'resolved_refund' || status === 'resolved_partial_refund') return 'destructive';
  if (status === 'resolved_tutor_upheld') return 'success';
  return 'outline';
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

  const disputes = response?.data || [];

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute) return;

    if (resolutionNotes.trim().length < 5) {
      toast.error(isBn ? 'অনুগ্রহ করে মীমাংসার কারণ লিখুন (কমপক্ষে ৫ অক্ষর)।' : 'Please provide resolution notes (min 5 chars).');
      return;
    }

    try {
      const refundAmountMinor = refundAmount.trim() ? Math.round(Number(refundAmount) * 100) : undefined;
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
    } catch (err: any) {
      toast.error(err?.data?.error?.message || (isBn ? 'নিষ্পত্তি ব্যর্থ হয়েছে।' : 'Failed to resolve dispute.'));
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
    <div className="space-y-4" data-testid="admin-disputes-tab-content">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {isBn ? 'বুকিং বিরোধ ও অভিযোগ ট্রায়াজ' : 'Active Booking Disputes Queue'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isBn
              ? 'শিক্ষার্থী ও অভিভাবকদের দাখিলকৃত ক্লাস সংক্রান্ত অভিযোগ ও এসক্রো রিফান্ড ব্যবস্থাপনা'
              : 'Evaluate customer complaints, investigate session logs, and execute binding escrow settlements'}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
        <Table data-testid="disputes-table">
          <TableHeader>
            <TableRow className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
              <TableHead className="px-4 py-3">{isBn ? 'বুকিং ও শিক্ষক' : 'Booking & Tutor'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'অভিযোগের কারণ' : 'Reason'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'দাবিকৃত রিফান্ড' : 'Claimed'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'অবস্থা' : 'Status'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'বিবরণ' : 'Description'}</TableHead>
              <TableHead className="px-4 py-3 text-right">{isBn ? 'পদক্ষেপ' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {disputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-success/60" />
                    <span>{isBn ? 'কোনো সক্রিয় বিরোধ নেই' : 'No active booking disputes'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              disputes.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/20">
                  <TableCell className="px-4 py-3 font-medium">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">
                        {d.booking?.subject?.name || 'Tuition'}
                      </span>
                      <div className="text-[11px] text-muted-foreground">
                        {d.booking?.tutorProfile?.user?.displayName || 'Tutor'} • #{d.bookingId.slice(0, 8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {disputeReasonLabel(d.reasonCode, isBn)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono font-semibold">
                    {d.disputedAmountMinor ? formatBDTMinor(d.disputedAmountMinor, locale) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant={statusVariant(d.status)} className="capitalize text-[10px]">
                      {d.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 max-w-xs truncate text-muted-foreground" title={d.description}>
                    {d.description}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {d.status === 'opened' || d.status === 'under_review' ? (
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
                        className="text-xs h-7.5 px-3 rounded-xl gap-1 font-bold"
                        data-testid={`triage-dispute-${d.id}`}
                      >
                        <span>{isBn ? 'নিষ্পত্তি করুন' : 'Triage & Resolve'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        {isBn ? 'নিষ্পন্ন' : 'Closed'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resolution Modal */}
      {activeDispute && (
        <Dialog open={!!activeDispute} onOpenChange={() => setActiveDispute(null)}>
          <DialogContent className="sm:max-w-md p-6 bg-card border-border rounded-2xl shadow-xl">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="w-5 h-5" />
                <DialogTitle className="text-base font-bold text-foreground">
                  {isBn ? 'বিরোধ মীমাংসা ও সিদ্ধান্ত' : 'Resolve Booking Dispute'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? `বুকিং #${activeDispute.bookingId.slice(0, 8)}-এর অভিযোগ পর্যালোচনা করুন।`
                  : `Evaluate complaint and execute binding resolution for Booking #${activeDispute.bookingId.slice(0, 8)}.`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResolve} className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-surface border border-border text-xs space-y-1">
                <span className="font-semibold text-foreground">
                  {isBn ? 'অভিযোগকারীর বক্তব্য:' : 'Disputant Statement:'}
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {activeDispute.description}
                </p>
              </div>

              {/* Resolution Decision */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'মীমাংসা সিদ্ধান্ত' : 'Resolution Decision'}
                </label>
                <NativeSelect
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full text-xs h-9.5 rounded-xl bg-surface border-border"
                >
                  <option value="refund">
                    {isBn ? '১০০% রিফান্ড অনুমোদন (Refund to Student)' : 'Full Refund to Customer'}
                  </option>
                  <option value="partial_refund">
                    {isBn ? 'আংশিক রিফান্ড (Partial Refund)' : 'Partial Refund'}
                  </option>
                  <option value="tutor_upheld">
                    {isBn ? 'শিক্ষক সঠিক / এসক্রো বহাল (Uphold Tutor)' : 'Uphold Tutor (Release Escrow)'}
                  </option>
                  <option value="replacement">
                    {isBn ? 'বিকল্প শিক্ষক প্রতিস্থাপন (Tutor Replacement)' : 'Trigger Replacement Guarantee'}
                  </option>
                  <option value="dismissed">
                    {isBn ? 'অভিযোগ খারিজ (Dismiss Claim)' : 'Dismiss Claim (Frivolous)'}
                  </option>
                </NativeSelect>
              </div>

              {/* Refund amount if applicable */}
              {(resolutionType === 'refund' || resolutionType === 'partial_refund') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {isBn ? 'অনুমোদিত রিফান্ড পরিমাণ (৳)' : 'Approved Refund Amount (BDT ৳)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Amount in BDT"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Resolution notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'তদন্ত নোট ও সিদ্ধান্তের ভিত্তি' : 'Investigation Rationale & Notes'}
                </label>
                <Textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    isBn
                      ? 'তদন্তের ফলাফল এবং সিদ্ধান্তের কারণ সংক্ষেপে লিখুন...'
                      : 'Document investigation findings and reasons for this resolution...'
                  }
                  className="text-xs rounded-xl bg-surface border-border resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDispute(null)}
                  className="text-xs rounded-xl"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resolving}
                  className="text-xs rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25"
                  data-testid="confirm-resolve-dispute-btn"
                >
                  {resolving ? (isBn ? 'প্রক্রিয়াধীন...' : 'Processing...') : isBn ? 'নিষ্পত্তি নিশ্চিত করুন' : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
