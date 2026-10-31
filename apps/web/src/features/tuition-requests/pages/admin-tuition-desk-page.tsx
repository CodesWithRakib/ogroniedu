'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
  Send,
  Eye,
  Briefcase,
  AlertCircle,
  ThumbsUp,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetAdminTuitionRequestsQuery,
  useGetAdminMatchCandidatesQuery,
  useSuggestTutorForRequestMutation,
  useUpdateAdminTuitionStatusMutation,
  type TuitionRequest,
  type MatchCandidate,
} from '@/store/services/tuition-requests-api';

export function AdminTuitionDeskPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TuitionRequest | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'matches' | 'applications'>('matches');
  const [adminNote, setAdminNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data, isLoading, refetch } = useGetAdminTuitionRequestsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search.trim() || undefined,
  });

  const {
    data: candidatesData,
    isLoading: candidatesLoading,
  } = useGetAdminMatchCandidatesQuery(selectedRequest?.id || '', {
    skip: !selectedRequest,
  });

  const [suggestTutor, { isLoading: isSuggesting }] = useSuggestTutorForRequestMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAdminTuitionStatusMutation();

  const requests = data?.data?.items || [];
  const candidates = candidatesData?.data || [];

  // Metrics
  const openCount = requests.filter((r) => r.status === 'open').length;
  const matchedCount = requests.filter((r) => r.status === 'matched').length;
  const demoCount = requests.filter((r) => r.status === 'demo_scheduled').length;
  const confirmedCount = requests.filter((r) => r.status === 'confirmed').length;
  const vipCount = requests.filter((r) => r.isVip).length;

  const handleSuggest = async (candidate: MatchCandidate) => {
    if (!selectedRequest) return;
    try {
      await suggestTutor({
        requestId: selectedRequest.id,
        tutorUserId: candidate.tutorUserId,
        matchScore: candidate.matchScore,
        adminNote: adminNote.trim() || `${candidate.tutorName} (${candidate.headline || 'Verified Educator'}) recommended by OgroniEdu Academic Team.`,
      }).unwrap();

      setFeedback({
        type: 'success',
        message: isBn
          ? `${candidate.tutorName} সফলভাবে অভিভাবককে প্রস্তাব করা হয়েছে!`
          : `Successfully suggested ${candidate.tutorName} to the guardian!`,
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to suggest tutor',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedRequest) return;
    try {
      await updateStatus({ requestId: selectedRequest.id, status: newStatus }).unwrap();
      setFeedback({
        type: 'success',
        message: isBn ? 'স্ট্যাটাস আপডেট সম্পন্ন হয়েছে' : 'Status updated successfully',
      });
      refetch();
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: newStatus as any });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to update status',
      });
    }
  };

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'টিউশন রিকোয়েস্ট ও ম্যাচিং ডেক্স' : 'Tuition Matching Desk'}
      subtitle={isBn ? 'অভিভাবকদের টিউশন রিকোয়েস্টে স্মার্ট ম্যাচিং ও শিক্ষক রেকমেন্ডেশন ম্যানেজমেন্ট' : 'Orchestrate student tuition requests, algorithmic candidate matches, and dispatch'}
    >
      <div className="space-y-6">
        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {isBn ? 'অপেক্ষমাণ রিকোয়েস্ট' : 'Open Requests'}
            </span>
            <span className="text-2xl font-extrabold text-foreground mt-1 block">{openCount}</span>
          </Card>
          <Card className="border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-primary block">
              {isBn ? 'টিউটর সাজেস্টেড' : 'Tutors Suggested'}
            </span>
            <span className="text-2xl font-extrabold text-primary mt-1 block">{matchedCount}</span>
          </Card>
          <Card className="border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-amber-500 block">
              {isBn ? 'পর্যালোচনাধীন' : 'In Review'}
            </span>
            <span className="text-2xl font-extrabold text-amber-500 mt-1 block">{demoCount}</span>
          </Card>
          <Card className="border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-emerald-500 block">
              {isBn ? 'নিশ্চিত টিউশন' : 'Confirmed Tuitions'}
            </span>
            <span className="text-2xl font-extrabold text-emerald-500 mt-1 block">{confirmedCount}</span>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5 p-4">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
              {isBn ? 'ভিআইপি এক্সপ্রেস' : 'VIP Express'}
            </span>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
              {vipCount}
            </span>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? 'রেফারেন্স, শিক্ষার্থী বা জেলা...' : 'Search ref, student or district...'}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={isBn ? 'স্ট্যাটাস ফিল্টার' : 'Status Filter'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সকল স্ট্যাটাস' : 'All Statuses'}</SelectItem>
                <SelectItem value="open">{isBn ? 'Open (অপেক্ষমাণ)' : 'Open'}</SelectItem>
                <SelectItem value="matched">{isBn ? 'Matched (সাজেস্টেড)' : 'Matched'}</SelectItem>
                <SelectItem value="demo_scheduled">{isBn ? 'Demo Scheduled' : 'Demo Scheduled'}</SelectItem>
                <SelectItem value="confirmed">{isBn ? 'Confirmed (নিশ্চিত)' : 'Confirmed'}</SelectItem>
                <SelectItem value="cancelled">{isBn ? 'Cancelled' : 'Cancelled'}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Requests Table */}
        <Card className="border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Student & Level</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4">Mode & Location</th>
                  <th className="py-3 px-4">Budget Offer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Suggestions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      {isBn ? 'কোনো রিকোয়েস্ট পাওয়া যায়নি' : 'No requests match your filter'}
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-primary">{r.requestReference}</span>
                        {r.isVip && (
                          <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-black">
                            VIP
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground block">{r.studentName}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {r.educationLevel ? (isBn ? r.educationLevel.nameBn : r.educationLevel.nameEn) : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(r.subjects || []).slice(0, 3).map((sub) => (
                            <span
                              key={sub.id}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground"
                            >
                              {isBn ? sub.nameBn : sub.nameEn}
                            </span>
                          ))}
                          {(r.subjects || []).length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{(r.subjects || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground block capitalize">
                          {r.learningMode.replace('_', ' ')}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {r.area ? `${r.area}, ` : ''}{r.district}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ৳ {r.salaryBudgetMin} - ৳ {r.salaryBudgetMax}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            r.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : r.status === 'matched'
                              ? 'bg-primary/10 text-primary'
                              : r.status === 'demo_scheduled'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground">
                          {(r.suggestions || []).length} suggested
                        </span>
                        <span className="text-muted-foreground block text-[10px]">
                          {(r.applications || []).length} applicants
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={withLocale(`/dashboard/admin/tuition-requests/${r.id}`, locale)}
                          className="inline-flex items-center justify-center rounded-md font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1.5 transition-colors shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          {isBn ? 'ম্যাচ ও বিস্তারিত' : 'Match & Details'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Matchmaking Drawer Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] bg-card border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">
                      {selectedRequest.requestReference}
                    </span>
                    <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-muted text-foreground">
                      {selectedRequest.status}
                    </span>
                    {selectedRequest.isVip && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-black">
                        VIP EXPRESS
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1">
                    {selectedRequest.studentName} ({selectedRequest.studentGender}) •{' '}
                    {(selectedRequest.subjects || []).map((s) => (isBn ? s.nameBn : s.nameEn)).join(', ')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedRequest.learningMode.replace('_', ' ')} • {selectedRequest.area}, {selectedRequest.district} • Budget: ৳ {selectedRequest.salaryBudgetMin} - ৳ {selectedRequest.salaryBudgetMax}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Update Strip */}
              <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-muted-foreground">{isBn ? 'স্ট্যাটাস পরিবর্তন:' : 'Change Status:'}</span>
                  <Select value={selectedRequest.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRequest.preferredTutorBackground && (
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">Requested Tutor:</span>{' '}
                    {selectedRequest.preferredTutorBackground} ({selectedRequest.preferredTutorGender} preferred)
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border px-5 bg-card">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('matches')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeModalTab === 'matches'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isBn ? 'অ্যালগরিদমিক ম্যাচ ক্যান্ডিডেটস' : 'Algorithm Matched Tutors'} ({candidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('applications')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeModalTab === 'applications'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  {isBn ? 'জব বোর্ড থেকে আবেদনকারী' : 'Tutor Job Board Applicants'} ({(selectedRequest.applications || []).length})
                </button>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {activeModalTab === 'matches' && (
                  <div>
                    <div className="mb-4">
                      <label className="text-xs font-bold text-foreground block mb-1">
                        {isBn ? 'অভিভাবকের জন্য পার্সোনালাইজড নোট (ঐচ্ছিক):' : 'Custom Endorsement Note for Guardian (Optional):'}
                      </label>
                      <Input
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder={isBn ? 'যেমন: বুয়েট সিএসই থেকে পাস করা অভিজ্ঞ শিক্ষক, ফিজিক্সে উনার ৫ বছরের সফলতার রেকর্ড রয়েছে।' : 'e.g., BUET graduate with 5 years experience in HSC Physics.'}
                      />
                    </div>

                    {candidatesLoading ? (
                      <div className="py-12 text-center">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : candidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {isBn ? 'কোনো উপযুক্ত টিউটর ক্যান্ডিডেট পাওয়া যায়নি' : 'No matching verified tutors found.'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {candidates.map((c) => {
                          const alreadySuggested = (selectedRequest.suggestions || []).some(
                            (s) => s.tutorUserId === c.tutorUserId,
                          );
                          return (
                            <div
                              key={c.tutorUserId}
                              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                alreadySuggested
                                  ? 'border-emerald-500/40 bg-emerald-500/5'
                                  : 'border-border bg-muted/20 hover:border-primary/40'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">{c.tutorName}</span>
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {c.matchScore}% Match
                                  </span>
                                  {alreadySuggested && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Suggested
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{c.headline || 'Verified Educator'}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {c.matchBreakdown.map((b, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSuggest(c)}
                                  disabled={isSuggesting}
                                  className={`font-bold text-xs ${
                                    alreadySuggested
                                      ? 'bg-muted text-muted-foreground hover:bg-muted'
                                      : 'bg-primary'
                                  }`}
                                >
                                  <Send className="w-3.5 h-3.5 mr-1" />
                                  {alreadySuggested
                                    ? (isBn ? 'পুনরায় সাজেস্ট' : 'Re-Suggest')
                                    : (isBn ? 'অভিভাবককে সাজেস্ট করুন' : 'Suggest Tutor')}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === 'applications' && (
                  <div className="space-y-3">
                    {(selectedRequest.applications || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {isBn ? 'এখনো কোনো শিক্ষক সরাসরি আবেদন করেননি' : 'No job board applications received yet.'}
                      </p>
                    ) : (
                      (selectedRequest.applications || []).map((app) => (
                        <div key={app.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">
                              {app.tutorProfile?.user?.displayName || 'Tutor Applicant'}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Proposed: ৳ {app.proposedSalary || 'Standard'} / month
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">"{app.coverPitch}"</p>
                          <div className="pt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                handleSuggest({
                                  tutorUserId: app.tutorUserId,
                                  tutorName: app.tutorProfile?.user?.displayName || 'Applicant',
                                  matchScore: 90,
                                  teachingModes: [],
                                  matchBreakdown: ['Direct Applicant via Job Board'],
                                });
                              }}
                              className="font-bold text-xs"
                            >
                              <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                              {isBn ? 'অনুমোদন ও সাজেস্ট' : 'Approve & Suggest to Guardian'}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
