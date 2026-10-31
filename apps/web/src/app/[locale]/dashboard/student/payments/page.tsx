'use client';

import { use } from 'react';
import Link from 'next/link';
import { ShieldCheck, BookOpen, ArrowRight } from 'lucide-react';
import { PaymentsPage } from '@/features/payments/pages/payments-page';
import { useAppSelector } from '@/store';
import { useGetMyGuardiansQuery } from '@/store/services/guardians-api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, Button } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function StudentPaymentsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
        title={isBn ? 'পেমেন্ট ও এসক্রো সিকিউরিটি' : 'Payment & Escrow Security'}
        subtitle={
          isBn
            ? 'সুরক্ষিত ও অভিভাবক নিয়ন্ত্রিত অ্যাকাউন্টে স্বাগতম'
            : 'Welcome to your safe guardian-managed academic portal'
        }
        role="student"
      >
        <div className="max-w-2xl mx-auto py-12 px-4" data-testid="child-payments-protected-notice">
          <Card className="p-8 text-center flex flex-col items-center gap-4 border border-border bg-card shadow-xs rounded-2xl">
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'অভিভাবক কর্তৃক নিয়ন্ত্রিত পেমেন্ট' : 'Guardian Managed Payments'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                {isBn
                  ? 'আপনার সকল টিউশন বুকিং, আর্থিক এসক্রো এবং পেমেন্ট আপনার অভিভাবক কর্তৃক পরিচালিত হয়। আপনার কোনো প্রকার ফি বা পেমেন্ট প্রক্রিয়া করার প্রয়োজন নেই।'
                  : 'All your tutoring fees, escrow protection, and payments are handled exclusively by your guardian. You do not need to make any payments.'}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="sm" className="rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                <Link href={withLocale('/dashboard/student/learning', locale)}>
                  <BookOpen className="w-4 h-4" />
                  <span>{isBn ? 'স্টাডি রুমে যান' : 'Go to Study Room'}</span>
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

  return <PaymentsPage locale={locale} />;
}
