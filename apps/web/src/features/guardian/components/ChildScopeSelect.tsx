'use client';

import { UserRound } from 'lucide-react';
import { useChildScope } from '@/features/guardian/hooks/use-child-scope';
import type { Locale } from '@/lib/i18n';

interface ChildScopeSelectProps {
  locale: Locale;
  scope: ReturnType<typeof useChildScope>;
  className?: string;
}

/**
 * Child switcher for guardian-facing booking/session surfaces. Renders nothing
 * for students and tutors. With a single active child it shows a read-only
 * identity chip; with multiple children it exposes an explicit selector.
 */
export function ChildScopeSelect({ locale, scope, className = '' }: ChildScopeSelectProps) {
  const isBn = locale === 'bn';
  if (!scope.isGuardian) return null;

  if (scope.isLoading) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ${className}`}
        aria-busy="true"
      >
        <UserRound className="w-3.5 h-3.5" />
        {isBn ? 'শিশুর তথ্য লোড হচ্ছে…' : 'Loading children…'}
      </div>
    );
  }

  if (scope.children.length === 0) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning-soft px-3 py-1.5 text-[11px] font-semibold text-warning-soft-foreground ${className}`}
      >
        <UserRound className="w-3.5 h-3.5" />
        {isBn ? 'কোনো সক্রিয় শিশু লিংক নেই' : 'No active child link'}
      </div>
    );
  }

  if (scope.children.length === 1) {
    const child = scope.children[0];
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-primary ${className}`}
        data-testid="child-scope-single"
      >
        <UserRound className="w-3.5 h-3.5" />
        <span className="text-muted-foreground font-semibold">{isBn ? 'শিশু:' : 'Child:'}</span>
        <span>{child.displayName}</span>
      </div>
    );
  }

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-xs ${className}`}
    >
      <UserRound className="w-3.5 h-3.5 text-primary" />
      <span className="text-muted-foreground">{isBn ? 'শিশু নির্বাচন:' : 'Viewing child:'}</span>
      <select
        value={scope.selectedStudentId ?? ''}
        onChange={(event) => scope.setSelectedStudentId(event.target.value || undefined)}
        className="bg-transparent font-bold text-foreground outline-none cursor-pointer max-w-[150px]"
        data-testid="child-scope-select"
        aria-label={isBn ? 'শিশু নির্বাচন করুন' : 'Select child'}
      >
        {scope.children.map((child) => (
          <option key={child.studentId} value={child.studentId}>
            {child.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
