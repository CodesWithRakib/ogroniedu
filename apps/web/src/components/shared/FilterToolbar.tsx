'use client';

import React from 'react';
import { SearchInput } from './SearchInput';
import { FilterChips, type ActiveFilter } from './FilterChips';

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onRemoveFilter,
  onResetFilters,
  children,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  onResetFilters?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3" data-testid="filter-toolbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full sm:max-w-xs"
        />
        {children}
      </div>
      {filters && onRemoveFilter && onResetFilters && (
        <FilterChips filters={filters} onRemove={onRemoveFilter} onResetAll={onResetFilters} />
      )}
    </div>
  );
}
