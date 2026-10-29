'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Lock,
  MessageSquare,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
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
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/NativeSelect';
import {
  useGetSafetyReportsQuery,
  useApplyProtectiveSafetyHoldMutation,
  useReleaseProtectiveSafetyHoldMutation,
  useAssignCaseMutation,
  useAddCaseMessageMutation,
  useUpdateCaseStatusMutation,
  useResolveSafetyCaseMutation,
  type SafetyReportRecord,
} from '@/store/services/trust-api';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

export function AdminSafetyTab({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { data: rawReports, isLoading, refetch } = useGetSafetyReportsQuery();
  const [applyHold, { isLoading: applyingHold }] = useApplyProtectiveSafetyHoldMutation();
  const [releaseHold, { isLoading: releasingHold }] = useReleaseProtectiveSafetyHoldMutation();
  const [assignCase, { isLoading: assigning }] = useAssignCaseMutation();
  const [addMessage, { isLoading: sendingMsg }] = useAddCaseMessageMutation();
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateCaseStatusMutation();
  const [resolveCase, { isLoading: resolvingCase }] = useResolveSafetyCaseMutation();

  const [activeReport, setActiveReport] = useState<SafetyReportRecord | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);

  // Investigation form states
  const [newStatus, setNewStatus] = useState<string>('under_review');
  const [statusReason, setStatusReason] = useState<string>('');
  const [investigatorId, setInvestigatorId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(true);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const reports: SafetyReportRecord[] = Array.isArray(rawReports)
    ? rawReports
    : (rawReports as any)?.data || [];

  const handleApplyHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    if (holdReason.trim().length < 5) {
      toast.error(
        isBn
          ? 'অনুগ্রহ করে স্থগিতাদেশের সুনির্দিষ্ট কারণ লিখুন।'
          : 'Please state hold reason (min 5 chars).',
      );
      return;
    }

    try {
      await applyHold({
        reportId: activeReport.id,
        reason: holdReason.trim(),
      }).unwrap();

      toast.success(
        isBn
          ? 'শিক্ষক প্রোফাইলে সুরক্ষামূলক স্থগিতাদেশ প্রয়োগ করা হয়েছে।'
          : 'Protective safety hold applied.',
      );
      setShowHoldModal(false);
      setHoldReason('');
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message ||
          (isBn ? 'স্থগিতাদেশ প্রয়োগ ব্যর্থ হয়েছে।' : 'Failed to apply safety hold.'),
      );
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !investigatorId.trim()) return;

    if (investigatorId.trim() === activeReport.reportedUserId) {
      toast.error(
        isBn
          ? 'স্বার্থের সংঘাত: অভিযুক্ত ব্যক্তিকে কেস তদন্তকারী হিসেবে নিয়োগ দেওয়া যাবে না।'
          : 'Conflict of interest: Implicated user cannot be assigned as investigator.',
      );
      return;
    }

    try {
      await assignCase({
        reportId: activeReport.id,
        assignedTo: investigatorId.trim(),
        reason: 'Assigned via admin safety desk',
      }).unwrap();

      toast.success(
        isBn ? 'কেস তদন্তকারী সফলভাবে নিয়োগ করা হয়েছে।' : 'Investigator successfully assigned.',
      );
      setInvestigatorId('');
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message || (isBn ? 'নিয়োগ ব্যর্থ হয়েছে।' : 'Failed to assign investigator.'),
      );
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    try {
      await updateStatus({
        reportId: activeReport.id,
        status: newStatus,
        reason: statusReason.trim() || undefined,
      }).unwrap();

      toast.success(
        isBn ? 'কেস স্ট্যাটাস আপডেট সম্পন্ন হয়েছে।' : 'Case status updated successfully.',
      );
      setStatusReason('');
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message ||
          (isBn ? 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' : 'Failed to update status.'),
      );
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !messageText.trim()) return;

    try {
      await addMessage({
        reportId: activeReport.id,
        message: messageText.trim(),
        isInternalNote,
      }).unwrap();

      toast.success(
        isInternalNote
          ? isBn
            ? 'অভ্যন্তরীণ তদন্তকারী নোট সংরক্ষিত হয়েছে।'
            : 'Internal investigator note recorded.'
          : isBn
            ? 'রিপোর্টারকে বার্তা প্রেরণ করা হয়েছে।'
            : 'Message dispatched to reporter.',
      );
      setMessageText('');
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message || (isBn ? 'বার্তা প্রেরণ ব্যর্থ হয়েছে।' : 'Failed to post message.'),
      );
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || resolutionNotes.trim().length < 5) {
      toast.error(
        isBn
          ? 'অনুগ্রহ করে বিস্তারিত সমাধান ও সিদ্ধান্ত লিপিবদ্ধ করুন।'
          : 'Please document resolution findings (min 5 chars).',
      );
      return;
    }

    try {
      await resolveCase({
        reportId: activeReport.id,
        resolutionNotes: resolutionNotes.trim(),
        status: 'resolved',
      }).unwrap();

      toast.success(isBn ? 'কেস সফলভাবে মীমাংসা করা হয়েছে।' : 'Case resolved successfully.');
      setResolutionNotes('');
      setShowInvestigateModal(false);
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message || (isBn ? 'মীমাংসা ব্যর্থ হয়েছে।' : 'Failed to resolve case.'),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  const criticalCount = reports.filter((r) => r.escalationLevel === 'urgent_child_safety').length;

  return (
    <div className="flex flex-col gap-4" data-testid="admin-safety-tab-content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              {isBn
                ? 'শিশু সুরক্ষা ও ট্রাস্ট ইনসিডেন্ট ট্রায়াজ'
                : 'Child Safeguarding & Incident Desk'}
            </h3>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="animate-pulse text-[10px] font-bold">
                {criticalCount} {isBn ? 'জরুরি অ্যালার্ট' : 'Urgent Child Safety'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isBn
              ? 'শিশু আইন ২০১৩ ও নীতি POL-SAFE-001 অনুযায়ী জিরো-টলারেন্স নিরাপত্তা প্রতিবেদন ও জরুরি ইন্টারভেনশন'
              : 'Zero-tolerance safeguarding reports, priority escalation and emergency protective intervention'}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table data-testid="safety-reports-table">
          <TableHeader>
            <TableRow className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
              <TableHead className="px-4 py-3">
                {isBn ? 'রিপোর্টার ও শিক্ষক' : 'Reporter & Target'}
              </TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'ক্যাটাগরি' : 'Category'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'অগ্রাধিকার' : 'Severity'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
              <TableHead className="px-4 py-3">{isBn ? 'বিবরণ' : 'Description'}</TableHead>
              <TableHead className="px-4 py-3 text-right">
                {isBn ? 'পদক্ষেপ' : 'Intervention'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center flex flex-col gap-1">
                    <ShieldCheck className="w-8 h-8 text-success/60" />
                    <span>{isBn ? 'কোনো নিরাপত্তা অভিযোগ নেই' : 'No active safety reports'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => {
                const isUrgent = r.escalationLevel === 'urgent_child_safety';
                return (
                  <TableRow
                    key={r.id}
                    className={
                      isUrgent ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/20'
                    }
                  >
                    <TableCell className="px-4 py-3 font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground">
                          {r.reportedUserId
                            ? `Tutor #${r.reportedUserId.slice(0, 8)}`
                            : isBn
                              ? 'সাধারণ রিপোর্ট'
                              : 'General'}
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          {isBn ? 'দায়েরকারী:' : 'By:'} #{r.reporterUserId.slice(0, 8)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant={r.category === 'child_safety' ? 'destructive' : 'outline'}
                        className="text-[11px] font-medium uppercase"
                      >
                        {r.category.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant={
                          r.severity === 'critical'
                            ? 'destructive'
                            : r.severity === 'high'
                              ? 'warning'
                              : 'outline'
                        }
                        className="capitalize text-[10px]"
                      >
                        {r.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {r.status?.replace(/_/g, ' ') || 'submitted'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="px-4 py-3 max-w-xs truncate text-muted-foreground"
                      title={r.description}
                    >
                      {r.description}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveReport(r);
                            setShowInvestigateModal(true);
                          }}
                          className="text-[11px] h-7 px-2.5 rounded-lg gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{isBn ? 'তদন্ত' : 'Investigate'}</span>
                        </Button>
                        {r.reportedUserId && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setActiveReport(r);
                              setShowHoldModal(true);
                            }}
                            className="text-[11px] h-7 px-2.5 rounded-lg gap-1 font-bold"
                            data-testid={`apply-hold-${r.id}`}
                          >
                            <UserX className="w-3 h-3" />
                            <span>{isBn ? 'স্থগিতাদেশ' : 'Safety Hold'}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Safety Hold Confirmation Modal */}
      {showHoldModal && activeReport && (
        <Dialog open={showHoldModal} onOpenChange={() => setShowHoldModal(false)}>
          <DialogContent className="sm:max-w-md p-6 bg-card border-border rounded-xl">
            <DialogHeader className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                <DialogTitle className="text-base font-bold text-foreground">
                  {isBn
                    ? 'শিক্ষক প্রোফাইলে জরুরি সুরক্ষামূলক স্থগিতাদেশ'
                    : 'Apply Protective Safety Hold'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? 'তদন্তাধীন শিক্ষকের প্রোফাইল তাৎক্ষণিকভাবে অপ্রকাশিত করা হবে এবং নতুন ক্লাস পরিচালনা অবরুদ্ধ করা হবে।'
                  : 'Immediately unpublishes the tutor profile and blocks starting live sessions.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApplyHold} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isBn ? 'স্থগিতাদেশের সুনির্দিষ্ট কারণ' : 'Specific Justification & Reason'}
                </label>
                <Textarea
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder={
                    isBn
                      ? 'স্থগিতাদেশ আরোপের সুনির্দিষ্ট অভিযোগ বা নিরাপত্তা লঙ্ঘন উল্লেখ করুন...'
                      : 'Specify the documented grounds for applying protective hold...'
                  }
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHoldModal(false)}
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={applyingHold}
                  className="font-bold gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    {applyingHold
                      ? isBn
                        ? 'স্থগিত হচ্ছে...'
                        : 'Applying...'
                      : isBn
                        ? 'স্থগিতাদেশ কার্যকর করুন'
                        : 'Confirm Safety Hold'}
                  </span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Case Investigation & Management Drawer */}
      {showInvestigateModal && activeReport && (
        <Dialog open={showInvestigateModal} onOpenChange={() => setShowInvestigateModal(false)}>
          <DialogContent className="sm:max-w-2xl p-6 bg-card border-border rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <DialogTitle className="text-base font-bold text-foreground">
                    {isBn
                      ? 'কেস তদন্ত ও কমপ্লায়েন্স ম্যানেজমেন্ট'
                      : 'Case Investigation & Management'}
                  </DialogTitle>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  #{activeReport.id.slice(0, 8)}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? 'গোপনীয়তা রক্ষা করে তদন্ত নোট, স্ট্যাটাস পরিবর্তন এবং সমাধান নথিভুক্ত করুন।'
                  : 'Manage confidential case lifecycle, internal notes, and formal resolutions.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 pt-3 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    {isBn ? 'ক্যাটাগরি' : 'Category'}
                  </span>
                  <div className="font-bold text-foreground capitalize mt-0.5">
                    {activeReport.category?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    {isBn ? 'অগ্রাধিকার' : 'Severity'}
                  </span>
                  <div className="font-bold text-destructive capitalize mt-0.5">
                    {activeReport.severity}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    {isBn ? 'গোপনীয়তা' : 'Privacy'}
                  </span>
                  <div className="font-bold text-foreground mt-0.5">
                    {activeReport.isConfidential
                      ? isBn
                        ? 'গোপনীয় 🔒'
                        : 'Confidential 🔒'
                      : isBn
                        ? 'সাধারণ'
                        : 'Standard'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                    {isBn ? 'বর্তমান স্ট্যাটাস' : 'Status'}
                  </span>
                  <div className="font-bold text-primary capitalize mt-0.5">
                    {activeReport.status?.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Incident Narrative */}
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground">
                  {isBn ? 'অভিযোগের বিবরণ:' : 'Incident Narrative:'}
                </span>
                <p className="bg-muted/40 p-3 rounded-xl text-muted-foreground leading-relaxed border border-border/60">
                  {activeReport.description}
                </p>
              </div>

              {/* Investigator Assignment */}
              <form
                onSubmit={handleAssign}
                className="flex flex-col gap-2 p-3 bg-card border border-border rounded-xl"
              >
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>
                    {isBn
                      ? 'তদন্তকারী কর্মকর্তা নিয়োগ (Conflict-of-Interest Guard)'
                      : 'Assign Investigator'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={investigatorId}
                    onChange={(e) => setInvestigatorId(e.target.value)}
                    placeholder={isBn ? 'তদন্তকারী ইউজারের UUID...' : 'Investigator User UUID...'}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                  />
                  <Button type="submit" size="sm" disabled={assigning}>
                    {assigning
                      ? isBn
                        ? 'নিয়োগ হচ্ছে...'
                        : 'Assigning...'
                      : isBn
                        ? 'নিয়োগ করুন'
                        : 'Assign'}
                  </Button>
                </div>
              </form>

              {/* State Transition */}
              <form
                onSubmit={handleUpdateStatus}
                className="flex flex-col gap-2 p-3 bg-card border border-border rounded-xl"
              >
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="w-4 h-4 text-warning" />
                  <span>{isBn ? 'কেস লাইফসাইকেল স্ট্যাটাস পরিবর্তন' : 'Update Case State'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <NativeSelect
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="text-xs"
                  >
                    <option value="triaged">Triaged</option>
                    <option value="under_review">Under Review</option>
                    <option value="awaiting_information">Awaiting Information</option>
                    <option value="escalated">Escalated</option>
                    <option value="action_taken">Action Taken</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="reopened">Reopened</option>
                  </NativeSelect>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder={isBn ? 'পরিবর্তনের কারণ...' : 'Reason for status update...'}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" variant="outline" disabled={updatingStatus}>
                    {updatingStatus
                      ? isBn
                        ? 'সংরক্ষণ হচ্ছে...'
                        : 'Saving...'
                      : isBn
                        ? 'স্ট্যাটাস আপডেট'
                        : 'Update State'}
                  </Button>
                </div>
              </form>

              {/* Messages & Internal Investigator Notes */}
              <form
                onSubmit={handleSendMessage}
                className="flex flex-col gap-2 p-3 bg-card border border-border rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>
                      {isBn ? 'তদন্ত নোট বা বার্তা প্রেরণ' : 'Case Messages & Internal Notes'}
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="font-semibold text-primary">
                      {isBn ? 'অভ্যন্তরীণ গোপন নোট (শুধুমাত্র স্টাফ)' : 'Internal Staff Note Only'}
                    </span>
                  </label>
                </div>
                <Textarea
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? isBn
                        ? 'অভ্যন্তরীণ তদন্ত ফাইন্ডিং বা নোট লিখুন (রিপোর্টার দেখতে পাবেন না)...'
                        : 'Record confidential internal finding (hidden from reporter)...'
                      : isBn
                        ? 'রিপোর্টারকে অতিরিক্ত তথ্যের জন্য বার্তা পাঠান...'
                        : 'Message to the reporter requesting additional details...'
                  }
                  className="text-xs"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={sendingMsg}>
                    {sendingMsg
                      ? isBn
                        ? 'পাঠানো হচ্ছে...'
                        : 'Posting...'
                      : isBn
                        ? 'নোট সংরক্ষণ'
                        : 'Post Message'}
                  </Button>
                </div>
              </form>

              {/* Resolution Section */}
              <form
                onSubmit={handleResolve}
                className="flex flex-col gap-2 p-3 bg-success/5 border border-success/30 rounded-xl"
              >
                <div className="flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isBn ? 'কেস চূড়ান্ত মীমাংসা ও সিদ্ধান্ত' : 'Final Case Resolution & Findings'}
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    isBn
                      ? 'চূড়ান্ত তদন্তের ফলাফল ও গৃহীত পদক্ষেপ বিশদভাবে লিখুন...'
                      : 'Document final findings, disciplinary actions, or counseling summary...'
                  }
                  className="text-xs"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-success hover:bg-success/90 text-white font-bold"
                    disabled={resolvingCase}
                  >
                    {resolvingCase
                      ? isBn
                        ? 'মীমাংসা হচ্ছে...'
                        : 'Resolving...'
                      : isBn
                        ? 'চূড়ান্ত সিদ্ধান্ত অনুমোদন'
                        : 'Confirm Case Resolution'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
