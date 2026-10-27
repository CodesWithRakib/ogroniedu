'use client';

import React, { use } from 'react';
import { AlertCircle } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useGetSessionByIdQuery, SessionItem } from '@/store/services/sessions-api';
import { ClassroomWorkspace } from '@/features/classroom';
import { useAppSelector } from '@/store';
import { parseItem } from '@/lib/api/parse';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

interface ClassroomPageParams {
  locale: string;
  id: string;
}

export default function ClassroomPageRoute({ params }: { params: Promise<ClassroomPageParams> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const sessionId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <ClassroomPageContent locale={locale} sessionId={sessionId} />
    </RequireAuth>
  );
}

function ClassroomPageContent({ locale, sessionId }: { locale: Locale; sessionId: string }) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');

  const { data: sessionData, isLoading, error } = useGetSessionByIdQuery(sessionId);

  const session = React.useMemo<SessionItem | null>(() => {
    if (!sessionData) return null;
    try {
      return parseItem<SessionItem>(sessionData);
    } catch {
      return null;
    }
  }, [sessionData]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center gap-3 z-50">
        <LoadingSpinner />
        <p className="text-xs text-muted-foreground font-medium">
          {locale === 'bn' ? 'লাইভ ক্লাসরুম লোড হচ্ছে...' : 'Loading live interactive classroom...'}
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] bg-background text-foreground flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-xl">
          <EmptyState
            title={locale === 'bn' ? 'ক্লাসরুম পাওয়া যায়নি' : 'Classroom Not Found'}
            description={
              locale === 'bn'
                ? 'অনুরোধকৃত ক্লাস সেশনের আইডি সঠিক নয় অথবা আপনার এই সেশনে প্রবেশের অনুমতি নেই।'
                : 'The requested classroom session could not be found or you may lack authorized access.'
            }
            icon={<AlertCircle className="h-6 w-6 text-rose-500" />}
            actionLabel={locale === 'bn' ? 'সব ক্লাসের সূচীতে ফিরুন' : 'Back to Sessions'}
            actionHref={withLocale('/sessions', locale)}
          />
        </div>
      </div>
    );
  }

  return (
    <ClassroomWorkspace
      session={session}
      locale={locale}
      isTutor={Boolean(isTutor)}
      standalone={true}
    />
  );
}
