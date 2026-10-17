'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n';

export interface ActiveFilter {
  key: string;
  label: string;
}

/** Active-filter chips with per-filter remove + reset-all. */
export function FilterChips({
  filters,
  onRemove,
  onResetAll,
  locale = 'bn',
}: {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onResetAll: () => void;
  locale?: Locale;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="filter-chips">
      {filters.map((f) => (
        <Badge key={f.key} variant="outline" className="gap-1 py-1">
          {f.label}
          <button
            type="button"
            aria-label={locale === 'bn' ? `${f.label} ফিল্টার সরান` : `Remove ${f.label} filter`}
            onClick={() => onRemove(f.key)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted/50"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onResetAll} data-testid="filter-reset-all">
        {locale === 'bn' ? 'সব রিসেট করুন' : 'Reset all'}
      </Button>
    </div>
  );
}
