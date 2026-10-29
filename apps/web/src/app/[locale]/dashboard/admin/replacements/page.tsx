'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Card,
  CardContent,
  Button,
  Badge,
  NativeSelect,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import {
  useGetReplacementCasesQuery,
  useRunReplacementOverdueSweepMutation,
  type ReplacementStatus,
} from '@/store/services/trust-api';

const STATUS_OPTIONS: Array<ReplacementStatus | 'all' | 'overdue'> = [
  'all',
  'overdue',
  'requested',
  'under_review',
  'matching',
  'offered',
  'accepted',
  'refund_eligible',
  'rejected',
  'closed',
  'cancelled',
];

export default function AdminReplacementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';

  const [filter, setFilter] = React.useState<(typeof STATUS_OPTIONS)[number]>('all');
  const query = React.useMemo(
    () =>
      filter === 'all'
        ? { page: 1, pageSize: 50 }
        : filter === 'overdue'
          ? { overdue: true, page: 1, pageSize: 50 }
          : { status: filter, page: 1, pageSize: 50 },
    [filter],
  );

  const { data, isLoading, isError, refetch } = useGetReplacementCasesQuery(query);
  const [runSweep, sweepState] = useRunReplacementOverdueSweepMutation();
  const [notice, setNotice] = React.useState<string | null>(null);

  const cases = data?.data ?? [];

  const handleSweep = async () => {
    setNotice(null);
    try {
      const result = await runSweep().unwrap();
      setNotice(
        isBn
          ? `${result.data.processed}টি সময়সীমা অতিক্রান্ত কেস চিহ্নিত হয়েছে।`
          : `${result.data.processed} overdue case(s) escalated.`,
      );
      refetch();
    } catch {
      setNotice(isBn ? 'স্যুইপ ব্যর্থ হয়েছে।' : 'The sweep failed.');
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'রিপ্লেসমেন্ট কেস কিউ' : 'Replacement case queue'}
      subtitle={
        isBn
          ? 'স্ট্যাটাস ও সময়সীমা অনুযায়ী কেস পর্যালোচনা ও সিদ্ধান্ত'
          : 'Review and decide replacement cases by status and deadline'
      }
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleSweep}
          disabled={sweepState.isLoading}
          className="gap-1.5 text-xs"
          data-testid="run-overdue-sweep"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {isBn ? 'ওভারডিউ স্যুইপ চালান' : 'Run overdue sweep'}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-foreground" htmlFor="queue-status-filter">
          {isBn ? 'ফিল্টার' : 'Filter'}
        </label>
        <NativeSelect
          id="queue-status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
          className="w-48 text-xs"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, ' ')}
            </option>
          ))}
        </NativeSelect>
      </div>

      {notice && (
        <Alert className="rounded-xl">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading cases...'}
        </p>
      ) : isError ? (
        <Card className="py-12 text-center rounded-xl">
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {isBn ? 'কিউ লোড করা যায়নি।' : 'Failed to load the queue.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : cases.length === 0 ? (
        <Card className="py-16 text-center rounded-xl">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isBn ? 'এই ফিল্টারে কোনো কেস নেই।' : 'No cases match this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3" data-testid="admin-replacement-queue">
          {cases.map((item) => (
            <Card key={item.id} className="rounded-xl bg-card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      #{item.id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {item.reasonCode.replace(/_/g, ' ')}
                    </Badge>
                    {item.isOverdue && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        {isBn ? 'ওভারডিউ' : 'Overdue'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isBn ? 'বুকিং:' : 'Booking:'} {item.bookingId.slice(0, 8)} ·{' '}
                    {isBn ? 'দায়ের:' : 'Filed:'} {formatDateTime(item.createdAt, locale)}
                    {item.deadlineAt
                      ? ` · ${isBn ? 'সময়সীমা:' : 'Deadline:'} ${formatDateTime(item.deadlineAt, locale)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="primary" className="capitalize">
                    {item.status.replace(/_/g, ' ')}
                  </Badge>
                  <Link
                    href={withLocale(`/dashboard/admin/replacements/${item.id}`, locale)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {isBn ? 'পর্যালোচনা' : 'Review'}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
