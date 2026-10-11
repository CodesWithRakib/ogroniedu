'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export const ADMIN_TABS = [
  'overview',
  'users',
  'bookings',
  'reconciliation',
  'settings',
  'featureFlags',
  'auditLogs',
] as const;

export type AdminTabKey = (typeof ADMIN_TABS)[number];

const TAB_LABEL_KEY: Record<AdminTabKey, string> = {
  overview: 'overviewTab',
  users: 'usersTab',
  bookings: 'bookingsTab',
  reconciliation: 'reconciliationTab',
  settings: 'settingsTab',
  featureFlags: 'featureFlagsTab',
  auditLogs: 'auditLogsTab',
};

export function AdminTabsBar({
  activeTab,
  onSelect,
}: {
  activeTab: AdminTabKey;
  onSelect: (tab: AdminTabKey) => void;
}) {
  const t = useTranslations('admin');

  return (
    <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2" role="tablist">
      {ADMIN_TABS.map((key) => (
        <button
          key={key}
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => onSelect(key)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap',
            activeTab === key
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900',
          )}
          data-testid={`tab-${key}`}
        >
          {t(TAB_LABEL_KEY[key])}
        </button>
      ))}
    </div>
  );
}
