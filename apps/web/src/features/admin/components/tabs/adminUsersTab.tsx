'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';

const STATUS_FILTERS = ['all', 'active', 'suspended'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function roleBadgeClass(role: string): string {
  if (role === 'super_admin') return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
  if (role === 'admin') return 'bg-primary/15 text-primary border border-primary/30';
  return 'bg-surface-muted text-muted-foreground border border-border/60';
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
          className="w-full sm:w-80 px-4 py-2 bg-surface/80 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
          data-testid="users-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 bg-surface/80 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          data-testid="users-status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="active">{t('statusActive')}</option>
          <option value="suspended">{t('statusSuspended')}</option>
        </select>
      </div>

      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <table className="w-full text-left text-xs" data-testid="users-table">
          <thead className="bg-surface text-muted-foreground border-b border-border uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-foreground">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-surface-hover/50 transition-colors"
                  data-testid={`user-row-${user.id}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {user.displayName}
                    <span className="block text-[10px] text-muted-foreground font-mono">{user.id}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
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
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      {user.status === 'active' ? t('statusActive') : t('statusSuspended')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => onRequestSuspend(user)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/30 transition text-[11px] font-medium"
                        data-testid={`suspend-user-btn-${user.id}`}
                      >
                        {t('suspendBtn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => onReactivate(user.id)}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/30 transition text-[11px] font-medium"
                        data-testid={`reactivate-user-btn-${user.id}`}
                      >
                        {t('reactivateBtn')}
                      </button>
                    )}

                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={() => onRequestRoles(user)}
                          className="px-2.5 py-1 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-lg transition text-[11px] font-medium"
                          data-testid={`manage-roles-btn-${user.id}`}
                        >
                          {t('rolesBtn')}
                        </button>
                        {!user.roles.includes('super_admin') && (
                          <button
                            onClick={() => onRequestImpersonate(user)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/30 transition text-[11px] font-medium"
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
