'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export const ADMIN_TABS = [
  'overview',
  'users',
  'bookings',
  'support',
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
  support: 'supportTab',
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
    <div className="flex border-b border-border gap-1.5 overflow-x-auto pb-2 scrollbar-none" role="tablist">
      {ADMIN_TABS.map((key) => (
        <button
          key={key}
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => onSelect(key)}
          className={cn(
            'px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer',
            activeTab === key
              ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
          )}
          data-testid={`tab-${key}`}
        >
          {t(TAB_LABEL_KEY[key])}
        </button>
      ))}
    </div>
  );
}
