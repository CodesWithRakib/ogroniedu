'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import {
  useLazyGetTutorReviewDossierQuery,
  type TutorReviewDecision,
} from '@/store/services/admin-api';
import { normalizeApiError } from '@/lib/api-error';
import type { PendingTutorItem } from '../../types/admin.types';
import { mapDossierQualifications, mapReviewHistory } from '../../utils/admin-mappers';

const STATUS_FILTERS = ['all', 'submitted', 'under_review', 'needs_information'] as const;

const DECISIONS: TutorReviewDecision[] = ['approved', 'rejected', 'needs_information', 'suspended'];

/**
 * Tutor verification queue: pending dossiers with inline review decisions.
 * All rows come from GET /admin/tutors/pending; decisions POST to
 * /admin/tutors/:id/review and refetch the queue via onReview.
 */
export function AdminVerificationTab({
  tutors,
  isLoading,
  queryError,
  onRetry,
  onReview,
}: {
  tutors: PendingTutorItem[];
  isLoading: boolean;
  queryError: string | null;
  onRetry: () => void;
  onReview: (input: {
    tutorId: string;
    decision: TutorReviewDecision;
    reasonCode: string;
    internalNotes?: string;
  }) => Promise<void>;
}) {
  const t = useTranslations('admin');
  const locale: Locale = useLocale() === 'bn' ? 'bn' : 'en';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTERS)[number]>('all');
  const [selected, setSelected] = React.useState<PendingTutorItem | null>(null);
  const [decision, setDecision] = React.useState<TutorReviewDecision>('approved');
  const [reasonCode, setReasonCode] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fetchDossier, dossierQuery] = useLazyGetTutorReviewDossierQuery();

  const filtered = tutors.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      row.displayName.toLowerCase().includes(q) ||
      (row.email?.toLowerCase().includes(q) ?? false) ||
      (row.headline?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === 'all' || row.verificationStatus === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function openDossier(row: PendingTutorItem) {
    setSelected(row);
    setDecision('approved');
    setReasonCode('');
    setNotes('');
    setFormError(null);
    fetchDossier(row.userId);
  }

  async function handleConfirmReview() {
    if (!selected) return;
    if (!reasonCode.trim()) {
      setFormError(locale === 'bn' ? 'সিদ্ধান্তের কারণ আবশ্যক।' : 'A reason code is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onReview({
        tutorId: selected.userId,
        decision,
        reasonCode: reasonCode.trim(),
        internalNotes: notes.trim() || undefined,
      });
      setSelected(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <LoadingState testId="verification-loading" />;
  if (queryError) {
    return <ErrorState message={queryError} onRetry={onRetry} testId="verification-error" />;
  }

  const dossier = (dossierQuery.data as { data?: Record<string, unknown> } | undefined)?.data;
  const dossierQualifications = mapDossierQualifications(
    (dossier as Record<string, unknown> | undefined)?.profile
      ? ((dossier as Record<string, unknown>).profile as Record<string, unknown>).qualifications
      : [],
  );
  const dossierHistory = mapReviewHistory(
    (dossier as Record<string, unknown> | undefined)?.reviewHistory ?? [],
  );

  return (
    <div className="space-y-4" data-testid="verification-tab-content">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 bg-surface/80 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
          data-testid="verification-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 bg-surface/80 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          data-testid="verification-status-filter"
          aria-label={locale === 'bn' ? 'অবস্থা অনুযায়ী ছাঁকুন' : 'Filter by status'}
        >
          <option value="all">{locale === 'bn' ? 'সব অবস্থা' : 'All statuses'}</option>
          {STATUS_FILTERS.filter((s) => s !== 'all').map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('verificationEmpty')}
          description={
            locale === 'bn'
              ? 'পর্যালোচনার জন্য অপেক্ষমাণ কোনো টিউটর প্রোফাইল নেই।'
              : 'No tutor profiles are waiting for review.'
          }
        />
      ) : (
        <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
          <table className="w-full text-left text-xs" data-testid="verification-table">
            <thead className="bg-surface text-muted-foreground border-b border-border uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">{locale === 'bn' ? 'টিউটর' : 'Tutor'}</th>
                <th className="px-4 py-3">{locale === 'bn' ? 'অবস্থা' : 'Status'}</th>
                <th className="px-4 py-3">{locale === 'bn' ? 'সনদ' : 'Docs'}</th>
                <th className="px-4 py-3">{locale === 'bn' ? 'জমার তারিখ' : 'Submitted'}</th>
                <th className="px-4 py-3 text-right">{locale === 'bn' ? 'পদক্ষেপ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filtered.map((row) => (
                <tr
                  key={row.userId}
                  className="hover:bg-surface-hover/50 transition-colors"
                  data-testid={`verification-row-${row.userId}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.displayName}
                    <span className="block text-[11px] text-muted-foreground font-normal">
                      {row.headline || row.email || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {row.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatLocalizedNumber(row.qualificationsCount, locale)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(row.submittedAt, locale)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => openDossier(row)}
                      data-testid={`review-tutor-btn-${row.userId}`}
                    >
                      {t('reviewAction')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('dossierTitle')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          data-testid="verification-dossier-modal"
        >
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground">{selected.displayName}</h3>
                <p className="text-xs text-muted-foreground">
                  {selected.email || selected.phoneE164 || '—'}
                  {selected.headline ? ` · ${selected.headline}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
                aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
              >
                ✕
              </button>
            </div>

            {dossierQuery.isFetching ? (
              <LoadingState testId="dossier-loading" />
            ) : dossierQuery.isError ? (
              <p role="alert" className="text-xs text-rose-600">
                {normalizeApiError(dossierQuery.error, locale).message}
              </p>
            ) : (
              <>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    {t('dossierQualifications')} (
                    {formatLocalizedNumber(dossierQualifications.length, locale)})
                  </h4>
                  {dossierQualifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {locale === 'bn' ? 'কোনো সনদ জমা হয়নি।' : 'No credentials submitted.'}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {dossierQualifications.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                          data-testid={`dossier-qual-${q.id}`}
                        >
                          <span className="font-medium text-foreground">
                            {q.title}
                            <span className="block text-[11px] text-muted-foreground font-normal">
                              {q.qualificationType}
                              {q.institution ? ` · ${q.institution}` : ''}
                            </span>
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {q.reviewStatus}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {dossierHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      {t('dossierHistory')}
                    </h4>
                    <ul className="space-y-1.5">
                      {dossierHistory.map((h) => (
                        <li
                          key={h.id}
                          className="rounded-lg bg-surface/60 border border-border/60 px-3 py-2 text-xs text-muted-foreground"
                        >
                          <span className="font-semibold text-foreground">{h.decision}</span>
                          {h.reasonCode ? ` · ${h.reasonCode}` : ''} ·{' '}
                          {formatDate(h.createdAt, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <form
              className="space-y-3 border-t border-border pt-4"
              data-testid="verification-decision-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmReview();
              }}
            >
              {formError && (
                <p
                  role="alert"
                  className="text-xs text-rose-600"
                  data-testid="verification-form-error"
                >
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="verification-decision"
                    className="text-xs font-medium text-foreground"
                  >
                    {t('decisionLabel')}
                  </label>
                  <select
                    id="verification-decision"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as TutorReviewDecision)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                    data-testid="verification-decision-select"
                  >
                    {DECISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="verification-reason"
                    className="text-xs font-medium text-foreground"
                  >
                    {t('reasonLabel')}
                  </label>
                  <input
                    id="verification-reason"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    placeholder={t('reasonPlaceholder')}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground"
                    data-testid="verification-reason-input"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="verification-notes" className="text-xs font-medium text-foreground">
                  {t('notesLabel')}
                </label>
                <textarea
                  id="verification-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  data-testid="verification-notes-input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
                  {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submitting}
                  data-testid="verification-confirm-btn"
                >
                  {t('confirmReview')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
