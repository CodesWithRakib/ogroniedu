'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AssignmentDetailPage } from '@/features/learning/pages/assignment-detail-page';
import type { Locale } from '@/lib/i18n';

interface AssignmentDetailRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function AssignmentDetailRoute({ params }: AssignmentDetailRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <AssignmentDetailPage locale={locale} assignmentId={resolved.id} />
    </RequireAuth>
  );
}
