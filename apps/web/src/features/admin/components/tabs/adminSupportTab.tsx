import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminSupportTicketItem } from '../../types/admin.types';

function supportStatusVariant(
  status: AdminSupportTicketItem['status'],
): 'info' | 'warning' | 'success' | 'outline' {
  if (status === 'submitted') return 'info';
  if (status === 'in_review') return 'warning';
  if (status === 'resolved') return 'success';
  return 'outline';
}

const NEXT_STATUS: readonly AdminSupportTicketItem['status'][] = [
  'submitted',
  'in_review',
  'resolved',
  'spam',
];

/** Staff triage queue for public contact tickets: filter, inspect, resolve. */
export function AdminSupportTab({
  tickets,
  onUpdateStatus,
}: {
  tickets: AdminSupportTicketItem[];
  onUpdateStatus: (
    id: string,
    status: AdminSupportTicketItem['status'],
    resolutionNotes?: string,
  ) => Promise<void>;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const visible =
    statusFilter === 'all' ? tickets : tickets.filter((row) => row.status === statusFilter);

  return (
    <div className="space-y-4" data-testid="support-tab-content">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
          <SelectTrigger
            className="w-44 h-10 rounded-xl bg-card border-border text-xs"
            data-testid="support-status-filter"
            aria-label={t('supportTab')}
          >
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {NEXT_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <Table data-testid="support-table">
          <TableHeader>
            <TableRow className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
              <TableHead className="px-4 py-3">Contact</TableHead>
              <TableHead className="px-4 py-3">Category</TableHead>
              <TableHead className="px-4 py-3">Message</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3">Resolution</TableHead>
              <TableHead className="px-4 py-3 text-right">Triage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/30 align-top transition-colors"
                  data-testid={`support-row-${row.id}`}
                >
                  <TableCell className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.email}</p>
                    {row.phoneE164 && (
                      <p className="text-[11px] text-muted-foreground font-mono">{row.phoneE164}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {row.createdAt}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {row.category}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-foreground/90 max-w-xs">
                    <p className="whitespace-pre-wrap break-words">{row.message}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={supportStatusVariant(row.status)}
                      size="sm"
                      className="text-[10px] font-semibold"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 min-w-40">
                    <Textarea
                      rows={2}
                      value={notes[row.id] ?? row.resolutionNotes ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder={isBn ? 'সমাধান নোট…' : 'Resolution notes…'}
                      className="rounded-xl text-[11px] min-h-[50px] resize-none"
                      data-testid={`support-notes-${row.id}`}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Select
                      value={row.status}
                      onValueChange={(val) =>
                        onUpdateStatus(
                          row.id,
                          val as AdminSupportTicketItem['status'],
                          notes[row.id],
                        )
                      }
                    >
                      <SelectTrigger
                        className="w-32 h-8 rounded-xl bg-card border-border text-[11px] ml-auto"
                        data-testid={`support-status-${row.id}`}
                        aria-label={
                          isBn
                            ? `${row.name}-এর টিকিট যাচাই করুন`
                            : `Triage ticket from ${row.name}`
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NEXT_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
