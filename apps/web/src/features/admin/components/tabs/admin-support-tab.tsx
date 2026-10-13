'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { AdminSupportTicketItem } from '../../types/admin.types';

const STATUS_TONE: Record<AdminSupportTicketItem['status'], string> = {
  submitted: 'bg-blue-500/20 text-blue-300',
  in_review: 'bg-amber-500/20 text-amber-300',
  resolved: 'bg-emerald-500/20 text-emerald-300',
  spam: 'bg-slate-700/60 text-slate-400',
};

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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
          data-testid="support-status-filter"
          aria-label={t('supportTab')}
        >
          <option value="all">{isBn ? 'সব অবস্থা' : 'All Statuses'}</option>
          {NEXT_STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
        <table className="w-full text-left text-xs" data-testid="support-table">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Resolution</th>
              <th className="px-4 py-3 text-right">Triage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-800/40 align-top"
                  data-testid={`support-row-${row.id}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{row.name}</p>
                    <p className="text-[11px] text-slate-400">{row.email}</p>
                    {row.phoneE164 && (
                      <p className="text-[11px] text-slate-500 font-mono">{row.phoneE164}</p>
                    )}
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{row.createdAt}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{row.category}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs">
                    <p className="whitespace-pre-wrap break-words">{row.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_TONE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-40">
                    <textarea
                      rows={2}
                      value={notes[row.id] ?? row.resolutionNotes ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder={isBn ? 'সমাধান নোট…' : 'Resolution notes…'}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                      data-testid={`support-notes-${row.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        onUpdateStatus(
                          row.id,
                          e.target.value as AdminSupportTicketItem['status'],
                          notes[row.id],
                        )
                      }
                      className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 focus:outline-none"
                      data-testid={`support-status-${row.id}`}
                      aria-label={isBn ? `${row.name}-এর টিকিট যাচাই করুন` : `Triage ticket from ${row.name}`}
                    >
                      {NEXT_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
