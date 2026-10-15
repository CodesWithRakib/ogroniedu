'use client';

import { useTranslations } from 'next-intl';
import type { AdminAuditLogItem } from '../../types/admin.types';

export function AdminAuditLogsTab({ auditLogs }: { auditLogs: AdminAuditLogItem[] }) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-4" data-testid="audit-logs-tab-content">
      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <table className="w-full text-left text-xs" data-testid="audit-logs-table">
          <thead className="bg-surface text-muted-foreground border-b border-border uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="px-4 py-3">{t('auditTimestamp')}</th>
              <th className="px-4 py-3">{t('auditActor')}</th>
              <th className="px-4 py-3">{t('auditAction')}</th>
              <th className="px-4 py-3">{t('auditResource')}</th>
              <th className="px-4 py-3">{t('auditReason')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-foreground">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-surface-hover/50 transition-colors"
                  data-testid={`audit-row-${log.id}`}
                >
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                    {log.createdAt}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-foreground/80">
                    {log.actorUserId || 'system'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-teal-600 dark:text-teal-400 font-mono">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.resourceType}:{log.resourceId || '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground/90">{log.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
