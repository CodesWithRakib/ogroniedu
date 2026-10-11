'use client';

import { useTranslations } from 'next-intl';
import type { AdminAuditLogItem } from '../../types/admin.types';

export function AdminAuditLogsTab({ auditLogs }: { auditLogs: AdminAuditLogItem[] }) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-4" data-testid="audit-logs-tab-content">
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
        <table className="w-full text-left text-xs" data-testid="audit-logs-table">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">{t('auditTimestamp')}</th>
              <th className="px-4 py-3">{t('auditActor')}</th>
              <th className="px-4 py-3">{t('auditAction')}</th>
              <th className="px-4 py-3">{t('auditResource')}</th>
              <th className="px-4 py-3">{t('auditReason')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-500">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-800/40"
                  data-testid={`audit-row-${log.id}`}
                >
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {log.createdAt}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                    {log.actorUserId || 'system'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-teal-400 font-mono">{log.action}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {log.resourceType}:{log.resourceId || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{log.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
