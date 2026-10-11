'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';

const STATUS_FILTERS = ['all', 'active', 'suspended'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function roleBadgeClass(role: string): string {
  if (role === 'super_admin') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
  if (role === 'admin') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
  return 'bg-slate-800 text-slate-300';
}

export function AdminUsersTab({
  users,
  isSuperAdmin,
  onRequestSuspend,
  onRequestRoles,
  onRequestImpersonate,
  onReactivate,
}: {
  users: AdminUserItem[];
  isSuperAdmin: boolean;
  onRequestSuspend: (user: AdminUserItem) => void;
  onRequestRoles: (user: AdminUserItem) => void;
  onRequestImpersonate: (user: AdminUserItem) => void;
  onReactivate: (userId: string) => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      u.displayName.toLowerCase().includes(query) ||
      (u.email?.toLowerCase().includes(query) ?? false) ||
      (u.phoneE164?.includes(searchQuery) ?? false);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-4" data-testid="users-tab-content">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          data-testid="users-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
          data-testid="users-status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="active">{t('statusActive')}</option>
          <option value="suspended">{t('statusSuspended')}</option>
        </select>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
        <table className="w-full text-left text-xs" data-testid="users-table">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-500">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-800/40"
                  data-testid={`user-row-${user.id}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {user.displayName}
                    <span className="block text-[10px] text-slate-500 font-mono">{user.id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {user.email || user.phoneE164 || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span
                          key={r}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${roleBadgeClass(r)}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {user.status === 'active' ? t('statusActive') : t('statusSuspended')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => onRequestSuspend(user)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded border border-rose-500/30 transition text-[11px]"
                        data-testid={`suspend-user-btn-${user.id}`}
                      >
                        {t('suspendBtn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => onReactivate(user.id)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded border border-emerald-500/30 transition text-[11px]"
                        data-testid={`reactivate-user-btn-${user.id}`}
                      >
                        {t('reactivateBtn')}
                      </button>
                    )}

                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={() => onRequestRoles(user)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition text-[11px]"
                          data-testid={`manage-roles-btn-${user.id}`}
                        >
                          {t('rolesBtn')}
                        </button>
                        {!user.roles.includes('super_admin') && (
                          <button
                            onClick={() => onRequestImpersonate(user)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition text-[11px]"
                            data-testid={`impersonate-btn-${user.id}`}
                          >
                            {t('triggerImpersonation')}
                          </button>
                        )}
                      </>
                    )}
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
