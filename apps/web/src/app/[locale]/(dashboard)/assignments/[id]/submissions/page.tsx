'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AssignmentSubmissionsPage } from '@/features/learning/pages/assignment-submissions-page';
import type { Locale } from '@/lib/i18n';

interface AssignmentSubmissionsParams {
  locale: string;
  id: string;
}

export default function AssignmentSubmissionsRoute({
  params,
}: {
  params: Promise<AssignmentSubmissionsParams>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const assignmentId = resolved.id;

  return (
    <RequireAuth locale={locale}>
      <AssignmentSubmissionsPage locale={locale} assignmentId={assignmentId} />
    </RequireAuth>
  );
}
