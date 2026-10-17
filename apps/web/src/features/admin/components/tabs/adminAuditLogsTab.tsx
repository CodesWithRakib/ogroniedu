'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import type { AdminAuditLogItem } from '../../types/admin.types';

export function AdminAuditLogsTab({ auditLogs }: { auditLogs: AdminAuditLogItem[] }) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-4" data-testid="audit-logs-tab-content">
      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <Table data-testid="audit-logs-table">
          <TableHeader>
            <TableRow className="uppercase tracking-wider text-[11px] font-bold">
              <TableHead className="px-4 py-3.5">{t('auditTimestamp')}</TableHead>
              <TableHead className="px-4 py-3.5">{t('auditActor')}</TableHead>
              <TableHead className="px-4 py-3.5">{t('auditAction')}</TableHead>
              <TableHead className="px-4 py-3.5">{t('auditResource')}</TableHead>
              <TableHead className="px-4 py-3.5">{t('auditReason')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {auditLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              auditLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-muted/40 transition-colors"
                  data-testid={`audit-row-${log.id}`}
                >
                  <TableCell className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {log.createdAt}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-[11px] text-foreground/80">
                    {log.actorUserId || 'system'}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-semibold text-primary font-mono">
                    {log.action}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {log.resourceType}:{log.resourceId || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-foreground/90">
                    {log.reason || '—'}
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
