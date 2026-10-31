'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button, LoadingSpinner } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GuardianLayout } from '@/layouts/guardian/GuardianLayout';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetMyTuitionRequestsQuery,
  useRespondToTuitionSuggestionMutation,
  useCancelTuitionRequestMutation,
  type TuitionRequest,
  type TuitionSuggestion,
} from '@/store/services/tuition-requests-api';

export function GuardianTuitionRequestsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { data, isLoading, refetch } = useGetMyTuitionRequestsQuery();
  const [respondToSuggestion, { isLoading: isResponding }] = useRespondToTuitionSuggestionMutation();
  const [cancelRequest, { isLoading: isCancelling }] = useCancelTuitionRequestMutation();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const requests = data?.data || [];

  const handleRespond = async (
    suggestionId: string,
    action: 'accept' | 'decline' | 'request_demo',
  ) => {
    try {
      await respondToSuggestion({ suggestionId, action }).unwrap();
      setFeedback({
        type: 'success',
        message:
          action === 'accept'
            ? (isBn ? 'শিক্ষক সফলভাবে নিশ্চিত ও টিউশন চূড়ান্ত করা হয়েছে!' : 'Tutor confirmed & tuition finalized!')
            : (isBn ? 'অন্য শিক্ষক খোঁজার অনুরোধ নথিভুক্ত হয়েছে।' : 'Alternative tutor requested.'),
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || (isBn ? 'অ্যাকশন সম্পন্ন করতে ব্যর্থ' : 'Action failed'),
      });
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!window.confirm(isBn ? 'আপনি কি নিশ্চিত যে এই রিকোয়েস্টটি বাতিল করতে চান?' : 'Cancel this tuition request?')) return;
    try {
      await cancelRequest(requestId).unwrap();
      setFeedback({
        type: 'success',
        message: isBn ? 'রিকোয়েস্ট বাতিল করা হয়েছে' : 'Request cancelled',
      });
      refetch();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.data?.message || 'Failed to cancel',
      });
    }
  };

  return (
    <GuardianLayout
      locale={locale}
      title={isBn ? 'আমার টিউশন রিকোয়েস্ট ও টিউটর প্রস্তাব' : 'My Tuition Requests & Suggested Tutors'}
      subtitle={isBn ? 'প্ল্যাটফর্মের মাধ্যমে টিউটর প্রস্তাব পর্যালোচনা ও শিক্ষক নিশ্চিত করুন' : 'Review admin-curated tutor matches and confirm your educator'}
      actions={
        <Link href={withLocale('/request-tutor', locale)}>
          <Button size="sm" className="flex items-center gap-1.5 font-bold">
            <PlusCircle className="w-4 h-4" />
            {isBn ? 'নতুন রিকোয়েস্ট' : 'New Request'}
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h3 className="text-base font-bold text-foreground">
              {isBn ? 'আপনার কোনো সক্রিয় টিউশন রিকোয়েস্ট নেই' : 'No Active Tuition Requests'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {isBn
                ? 'আপনার সন্তানের ক্লাসের জন্য একটি রিকোয়েস্ট পোস্ট করুন, আমাদের টিম সেরা শিক্ষক খুঁজে দেবে।'
                : 'Post what you need and our platform will match vetted educators for you.'}
            </p>
            <Link href={withLocale('/request-tutor', locale)}>
              <Button size="sm" className="font-bold">
                {isBn ? 'এখনই রিকোয়েস্ট পোস্ট করুন' : 'Post Tuition Request'}
              </Button>
            </Link>
          </Card>
        ) : (
          requests.map((req) => (
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
                    {req.studentName} • {req.educationLevel ? (isBn ? req.educationLevel.nameBn : req.educationLevel.nameEn) : ''}
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
                      onClick={() => handleCancel(req.id)}
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
                      {req.learningMode === 'online' ? (isBn ? 'অনলাইন' : 'Online') : `${req.area || ''}, ${req.district}`}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground">{isBn ? 'শিডিউল:' : 'Schedule:'}</span>
                    <span className="font-semibold text-foreground">{req.daysPerWeek} {isBn ? 'দিন/সপ্তাহ' : 'days/wk'}</span>
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
                      {isBn ? 'অ্যাডমিন প্রস্তাবিত শিক্ষকগণ (Curated Matches)' : 'Admin Recommended Tutors'}
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
                          : 'Our academic team is currently evaluating top tutor profiles for this request. Suggestions will appear here shortly.'}
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
    </GuardianLayout>
  );
}
