'use client';

import { use } from 'react';
import Link from 'next/link';
import { ShieldCheck, BookOpen, ArrowRight } from 'lucide-react';
import { RequestsHubPage } from '@/features/guardian/pages/guardian-requests-hub-page';
import { useAppSelector } from '@/store';
import { useGetMyGuardiansQuery } from '@/store/services/guardians-api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, Button } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function StudentRequestsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';

  const user = useAppSelector((s) => s.auth.user);
  const { data: myGuardians } = useGetMyGuardiansQuery(undefined, { skip: !user?.id });

  const isChild = Boolean(user?.hasGuardian || user?.isMinor || (myGuardians && myGuardians.length > 0));

  if (isChild) {
    return (
      <DashboardShell
        locale={locale}
        title={isBn ? 'টিউশন রিকোয়েস্ট ও শিক্ষক প্রস্তাব' : 'Tuition Requests & Proposals'}
        subtitle={
          isBn
            ? 'সুরক্ষিত ও অভিভাবক নিয়ন্ত্রিত অ্যাকাউন্টে স্বাগতম'
            : 'Welcome to your safe guardian-managed academic portal'
        }
        role="student"
      >
        <div className="max-w-2xl mx-auto py-12 px-4" data-testid="child-requests-protected-notice">
          <Card className="p-8 text-center flex flex-col items-center gap-4 border border-border bg-card shadow-xs rounded-2xl">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'অভিভাবক কর্তৃক পরিচালিত রিকোয়েস্ট' : 'Guardian Managed Requests'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                {isBn
                  ? 'আপনার নতুন শিক্ষক নির্বাচন ও টিউশন রিকোয়েস্ট আপনার অভিভাবক পরিচালনা করেন। নির্বাচিত শিক্ষক চূড়ান্ত হলে আপনার ড্যাশবোর্ড ও শিডিউলে প্রদর্শিত হবে।'
                  : 'Your tutor selection and tuition requests are managed by your guardian. Confirmed tutors will appear directly on your schedule and dashboard.'}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="sm" className="rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                <Link href={withLocale('/dashboard/student/sessions', locale)}>
                  <BookOpen className="w-4 h-4" />
                  <span>{isBn ? 'ক্লাস রুটিন দেখুন' : 'View Class Schedule'}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl border-border hover:bg-surface-hover">
                <Link href={withLocale('/dashboard/student', locale)} className="flex items-center gap-1.5">
                  <span>{isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return <RequestsHubPage locale={locale} role="student" />;
}
