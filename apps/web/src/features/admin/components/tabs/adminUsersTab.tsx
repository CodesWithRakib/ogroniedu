'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import type { AdminUserItem } from '../../types/admin.types';

const STATUS_FILTERS = ['all', 'active', 'suspended'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function roleBadgeVariant(role: string): 'destructive' | 'primary' | 'outline' {
  if (role === 'super_admin') return 'destructive';
  if (role === 'admin') return 'primary';
  return 'outline';
}

export function AdminUsersTab({
  users,
  isSuperAdmin,
  onRequestSuspend,
  onRequestRoles,
  onRequestImpersonate,
  onReactivate,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  users: AdminUserItem[];
  isSuperAdmin: boolean;
  onRequestSuspend: (user: AdminUserItem) => void;
  onRequestRoles: (user: AdminUserItem) => void;
  onRequestImpersonate: (user: AdminUserItem) => void;
  onReactivate: (userId: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  // Server already scopes rows by the lifted search/status query; the local
  // pass only guards against stale rows racing a refetch.
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      u.displayName.toLowerCase().includes(query) ||
      (u.email?.toLowerCase().includes(query) ?? false) ||
      (u.phoneE164?.includes(searchQuery.trim()) ?? false)
    );
  });

  return (
    <div className="space-y-4" data-testid="users-tab-content">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-80 h-10 rounded-xl"
          data-testid="users-search-input"
        />
        <Select
          value={statusFilter}
          onValueChange={(val) => onStatusFilterChange(val as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-card border-border text-xs" data-testid="users-status-filter">
            <SelectValue placeholder={t('allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            <SelectItem value="active">{t('statusActive')}</SelectItem>
            <SelectItem value="suspended">{t('statusSuspended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
        <Table data-testid="users-table">
          <TableHeader>
            <TableRow className="bg-muted/30 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
              <TableHead className="px-4 py-3">User</TableHead>
              <TableHead className="px-4 py-3">Contact</TableHead>
              <TableHead className="px-4 py-3">Roles</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-foreground text-xs">
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-muted/40 transition-colors"
                  data-testid={`user-row-${user.id}`}
                >
                  <TableCell className="px-4 py-3 font-medium text-foreground">
                    {user.displayName}
                    <span className="block text-[10px] text-muted-foreground font-mono">
                      {user.id}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {user.email || user.phoneE164 || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <Badge
                          key={r}
                          variant={roleBadgeVariant(r)}
                          size="sm"
                          className="text-[10px] uppercase font-semibold"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={
                        user.status === 'active'
                          ? 'success'
                          : user.status === 'suspended'
                            ? 'destructive'
                            : 'warning'
                      }
                      size="sm"
                      className="text-[10px] font-semibold"
                    >
                      {user.status === 'active'
                        ? t('statusActive')
                        : user.status === 'suspended'
                          ? t('statusSuspended')
                          : user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right space-x-2">
                    {user.status !== 'suspended' ? (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => onRequestSuspend(user)}
                        className="rounded-lg text-[11px] font-medium"
                        data-testid={`suspend-user-btn-${user.id}`}
                      >
                        {t('suspendBtn')}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onReactivate(user.id)}
                        className="rounded-lg text-[11px] font-medium"
                        data-testid={`reactivate-user-btn-${user.id}`}
                      >
                        {t('reactivateBtn')}
                      </Button>
                    )}

                    {isSuperAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onRequestRoles(user)}
                          className="rounded-lg text-[11px] font-medium"
                          data-testid={`manage-roles-btn-${user.id}`}
                        >
                          {t('rolesBtn')}
                        </Button>
                        {!user.roles.includes('super_admin') && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => onRequestImpersonate(user)}
                            className="rounded-lg text-[11px] font-medium"
                            data-testid={`impersonate-btn-${user.id}`}
                          >
                            {t('triggerImpersonation')}
                          </Button>
                        )}
                      </>
                    )}
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
