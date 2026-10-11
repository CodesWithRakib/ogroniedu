'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ActiveFilter {
  key: string;
  label: string;
}

/** Active-filter chips with per-filter remove + reset-all. */
export function FilterChips({
  filters,
  onRemove,
  onResetAll,
}: {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onResetAll: () => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="filter-chips">
      {filters.map((f) => (
        <Badge key={f.key} variant="outline" className="gap-1 py-1">
          {f.label}
          <button
            type="button"
            aria-label={`Remove ${f.label} filter`}
            onClick={() => onRemove(f.key)}
            className="ml-1 rounded-full p-0.5 hover:bg-slate-300/50"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onResetAll} data-testid="filter-reset-all">
        Reset all
      </Button>
    </div>
  );
}
