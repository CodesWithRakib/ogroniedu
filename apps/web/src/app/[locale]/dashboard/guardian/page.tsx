'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppSelector } from '@/store';
import {
  useGetLinkedChildrenQuery,
  useLinkChildRequestMutation,
  useRevokeChildLinkMutation,
} from '@/store/services/guardians-api';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';

function GuardianDashboardContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const childrenQuery = useGetLinkedChildrenQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const [linkChild] = useLinkChildRequestMutation();
  const [revokeLink] = useRevokeChildLinkMutation();
  const [activeChildId, setActiveChildId] = React.useState<string | null>(null);

  const children = childrenQuery.data ?? [];
  const activeChild = children.find((c) => c.studentId === activeChildId) ?? children[0] ?? null;

  React.useEffect(() => {
    if (!activeChildId && children[0]) setActiveChildId(children[0].studentId);
  }, [children, activeChildId]);

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'অভিভাবক ড্যাশবোর্ড' : 'Guardian dashboard'}
      subtitle={user?.displayName ?? ''}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="guardian-overview-grid">
        <Card><CardHeader><CardTitle className="text-sm">{dict.guardian.childrenTitle}</CardTitle></CardHeader>
          <CardContent>
            {childrenQuery.isLoading ? <LoadingSpinner /> : (
              <p className="text-2xl font-bold" data-testid="guardian-children-count">{formatLocalizedNumber(children.length, locale)}</p>
            )}
            {childrenQuery.isError && <p className="text-xs text-rose-600">{normalizeApiError(childrenQuery.error, locale).message}</p>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">{locale === 'bn' ? 'বুকিং' : 'Bookings'}</CardTitle></CardHeader>
          <CardContent>
            {requests.isLoading ? <LoadingSpinner /> : (
              <p className="text-2xl font-bold" data-testid="guardian-requests-count">{formatLocalizedNumber(requests.data?.data?.length ?? 0, locale)}</p>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">{locale === 'bn' ? 'ক্লাস' : 'Sessions'}</CardTitle></CardHeader>
          <CardContent>
            {sessions.isLoading ? <LoadingSpinner /> : (
              <p className="text-2xl font-bold" data-testid="guardian-sessions-count">{formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)}</p>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">{locale === 'bn' ? 'সক্রিয় শিক্ষার্থী' : 'Active child'}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-semibold" data-testid="guardian-active-child">{activeChild?.displayName ?? '—'}</p>
            <Link className="text-xs text-emerald-700 underline" href={withLocale('/tutors', locale)}>
              {dict.nav.findTutors}
            </Link>
          </CardContent>
        </Card>
      </div>

      {children.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={dict.guardian.childrenTitle} data-testid="child-switcher">
          {children.map((c) => (
            <button
              key={c.studentId}
              role="tab"
              aria-selected={activeChild?.studentId === c.studentId}
              onClick={() => setActiveChildId(c.studentId)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium ${activeChild?.studentId === c.studentId ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}
              data-testid={`child-tab-${c.studentId}`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6" data-testid="guardian-children-section">
        {childrenQuery.isLoading ? (
          <LoadingSpinner />
        ) : (
          <GuardianChildrenManager
            locale={locale}
            initialChildren={children.map((c) => ({
              linkId: c.linkId,
              studentId: c.studentId,
              displayName: c.displayName,
              relationshipType: c.relationshipType,
              status: c.status,
              consentPolicyVersion: c.consentPolicyVersion,
              consentRecordedAt: c.consentRecordedAt,
              isMinor: c.isMinor,
              institutionName: c.institutionName,
              educationLevelName: c.educationLevelName,
            }))}
            onAddChild={async (data) => {
              await linkChild(data).unwrap();
              childrenQuery.refetch();
            }}
            onRevokeLink={async (studentId) => {
              await revokeLink({ studentId, reason: 'guardian_requested' }).unwrap();
              childrenQuery.refetch();
            }}
          />
        )}
      </div>
    </DashboardShell>
  );
}

export default function GuardianDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <GuardianDashboardContent locale={locale} />
    </RequireAuth>
  );
}
