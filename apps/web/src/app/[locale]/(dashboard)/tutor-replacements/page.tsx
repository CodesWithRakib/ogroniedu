'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ShieldCheck,
  Clock,
  CheckCircle2,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import {
  useGetReplacementCasesQuery,
  useUpdateReplacementCaseMutation,
} from '@/store/services/trust-api';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

export default function TutorReplacementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';

  const { data: casesData, isLoading, refetch } = useGetReplacementCasesQuery();
  const [updateReplacementCase, { isLoading: isUpdating }] = useUpdateReplacementCaseMutation();

  const rawCases = Array.isArray(casesData)
    ? casesData
    : casesData &&
        typeof casesData === 'object' &&
        'data' in casesData &&
        Array.isArray((casesData as { data: unknown[] }).data)
      ? (casesData as { data: typeof casesData }).data
      : [];

  const cases = Array.isArray(rawCases) ? rawCases : [];

  const handleAcceptReplacement = async (caseId: string, replacementTutorId?: string | null) => {
    try {
      await updateReplacementCase({
        id: caseId,
        body: {
          status: 'accepted',
          replacementTutorUserId: replacementTutorId,
          outcomeNotes: 'Replacement tutor accepted by guardian/student.',
        },
      }).unwrap();

      playAudioTone('success');
      toast.success(isBn ? 'নতুন শিক্ষক সফলভাবে যুক্ত করা হয়েছে' : 'Replacement Tutor Accepted', {
        description: isBn
          ? 'বুকিংটি নতুন শিক্ষকের সাথে পুনর্নির্ধারণ করা হয়েছে।'
          : 'Booking successfully rebound with the new verified tutor.',
      });
      refetch();
    } catch {
      toast.error(isBn ? 'অনুমোদন ব্যর্থ হয়েছে' : 'Failed to accept replacement');
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি কেস' : 'Tutor Replacement Guarantee Cases'}
      subtitle={
        isBn
          ? '৪৮ ঘণ্টার মধ্যে নতুন যাচাইকৃত শিক্ষক ম্যাচিং অথবা ১০০% এসক্রো রিফান্ড ট্র্যাকার'
          : '48-Hour SLA Replacement Tracker: Guaranteed verified matching or 100% escrow refund'
      }
      role="guardian"
      actions={
        <Link
          href={withLocale('/dashboard/guardian/requests', locale)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary-hover"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isBn ? 'বুকিং তালিকা থেকে রিপ্লেসমেন্ট দাবি' : 'Claim from Bookings'}</span>
        </Link>
      }
    >
      {/* 1. 48-HOUR SLA HERO BANNER */}
      <div className="p-5 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <RefreshCw className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">
                {isBn
                  ? '৪৮ ঘণ্টার মধ্যে শিক্ষক নিশ্চিতকরণ বা সম্পূর্ণ রিফান্ড'
                  : '48-Hour Matching Guarantee (FR-011)'}
              </h3>
              <Badge variant="outline" className="text-xs border-primary/40 text-success-soft-foreground">
                {isBn ? '১০০% মানি-ব্যাক' : '100% Refundable'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {isBn
                ? 'শিক্ষকের অনুপলব্ধতা, বোঝানোর অসঙ্গতি বা অসদাচরণ হলে আপনি যেকোনো সময় বিকল্প শিক্ষক চাইতে পারেন। ৪৮ ঘণ্টার মধ্যে সমাধান না হলে এসক্রো ফান্ড সম্পূর্ণ ফেরত দেওয়া হবে।'
                : 'If your matched tutor fails to meet expectations or cancels sessions, our operations team guarantees a vetted replacement within 48 hours or full escrow reversal.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/40 text-success-soft-foreground  font-bold text-xs shrink-0">
          <Clock className="w-4 h-4" />
          <span>{isBn ? '৪৮ ঘণ্টা কঠোর SLA ট্র্যাকিং' : 'Strict 48-Hour SLA Active'}</span>
        </div>
      </div>

      {/* 2. REPLACEMENT CASES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-sm font-bold text-foreground">
            {isBn
              ? `সক্রিয় ও অতীতের রিপ্লেসমেন্ট কেস (${cases.length})`
              : `Replacement Requests (${cases.length})`}
          </h4>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {isBn ? 'লোড হচ্ছে...' : 'Loading replacement cases...'}
          </div>
        ) : cases.length === 0 ? (
          <Card className="py-16 text-center rounded-3xl">
            <CardContent className="space-y-3">
              <ShieldCheck className="w-14 h-14 text-success-soft-foreground mx-auto" />
              <h4 className="text-base font-bold text-foreground">
                {isBn ? 'কোনো সক্রিয় রিপ্লেসমেন্ট কেস নেই' : 'No Replacement Cases Filed'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isBn
                  ? 'আপনার সকল শিক্ষক বুকিং সন্তোষজনকভাবে পরিচালিত হচ্ছে। শিক্ষক পরিবর্তনের প্রয়োজন হলে বুকিং ডিটেইলস পেজ থেকে আবেদন করতে পারেন।'
                  : 'All your tutoring arrangements are running smoothly. You can file a replacement from your booking details.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="replacement-cases-list">
            {cases.map((c) => (
              <Card key={c.id} className="rounded-3xl border-border bg-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        Case #{c.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-primary/30 text-primary capitalize"
                      >
                        {c.reasonCode.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {isBn ? 'দায়ের সময়:' : 'Filed:'}{' '}
                      {formatDateTime(String(c.createdAt), locale)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      c.status === 'accepted'
                        ? 'success'
                        : c.status === 'requested' || c.status === 'matching'
                          ? 'warning'
                          : 'outline'
                    }
                  >
                    {c.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="text-xs text-foreground space-y-1">
                  <span className="font-bold text-muted-foreground block">
                    {isBn ? 'অভিযোগ / প্রত্যাশা:' : 'Reason & Explanation:'}
                  </span>
                  <p className="p-3 rounded-2xl bg-card border border-border text-foreground">
                    {c.explanation}
                  </p>
                </div>

                {/* Progress Stepper */}
                <div className="p-3.5 rounded-2xl bg-surface/50 border border-border flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success-soft-foreground" />
                    <span className="font-bold text-foreground">
                      {isBn ? '১. অনুরোধ গৃহীত' : '1. Requested'}
                    </span>
                  </div>
                  <div className="w-8 h-0.5 bg-border" />
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${['matching', 'offered', 'accepted'].includes(c.status) ? 'text-success-soft-foreground' : 'text-muted-foreground'}`}
                    />
                    <span className="font-bold text-foreground">
                      {isBn ? '২. শিক্ষক ম্যাচিং' : '2. Matching'}
                    </span>
                  </div>
                  <div className="w-8 h-0.5 bg-border" />
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${c.status === 'accepted' ? 'text-success-soft-foreground' : 'text-muted-foreground'}`}
                    />
                    <span className="font-bold text-foreground">
                      {isBn ? '৩. ক্লাস চালু' : '3. Rebound'}
                    </span>
                  </div>
                </div>

                {/* Replacement Tutor Offered Card */}
                {c.replacementTutorUserId && c.status !== 'accepted' && (
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-6 h-6 text-primary" />
                      <div>
                        <h5 className="font-bold text-foreground text-xs">
                          {isBn
                            ? 'নতুন বিকল্প শিক্ষক প্রস্তাব করা হয়েছে'
                            : 'Replacement Tutor Offered'}
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          {c.replacementTutor?.displayName ||
                            (isBn ? 'যাচাইকৃত বিকল্প শিক্ষক' : 'Verified Alternate Tutor')}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleAcceptReplacement(c.id, c.replacementTutorUserId)}
                      className="gap-1 text-xs bg-primary hover:bg-primary-hover text-white font-bold"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isBn ? 'শিক্ষক গ্রহণ করুন' : 'Accept Tutor'}</span>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
