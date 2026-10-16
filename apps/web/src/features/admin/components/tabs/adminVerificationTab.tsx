'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { playAudioTone } from '@/lib/audio/notification-sound';
import {
  useLazyGetTutorReviewDossierQuery,
  type TutorReviewDecision,
} from '@/store/services/admin-api';
import { useLazyGetFileAccessQuery } from '@/store/services/files-api';
import { normalizeApiError } from '@/lib/api-error';
import type { PendingTutorItem, TutorDossierQualification } from '../../types/admin.types';
import { mapDossierQualifications, mapReviewHistory } from '../../utils/admin-mappers';

const STATUS_FILTERS = ['all', 'submitted', 'under_review', 'needs_information'] as const;

const DECISIONS: TutorReviewDecision[] = ['approved', 'rejected', 'needs_information', 'suspended'];

const PRESET_REASON_CODES = [
  {
    code: 'nid_verified_match',
    bn: 'জাতীয় পরিচয়পত্র ও সনদ সঠিক (NID & Credentials Verified)',
    en: 'NID & Credentials Verified',
  },
  {
    code: 'degree_verified',
    bn: 'স্বীকৃত বিশ্ববিদ্যালয় থেকে ডিগ্রি যাচাই সম্পন্ন',
    en: 'Accredited University Degree Verified',
  },
  {
    code: 'photo_mismatch',
    bn: 'ছবি বা ব্যক্তিগত তথ্যে অসঙ্গতি (Photo/Identity Mismatch)',
    en: 'Photo/Identity Mismatch',
  },
  {
    code: 'illegible_document',
    bn: 'সনদপত্রের ছবি অস্পষ্ট বা অপাঠ্য (Illegible Document)',
    en: 'Illegible or Unreadable Document',
  },
  {
    code: 'unrecognized_institution',
    bn: 'অস্বীকৃত প্রতিষ্ঠান বা সনদ অসম্পূর্ণ',
    en: 'Unrecognized Institution or Incomplete Credential',
  },
  {
    code: 'self_reported_experience',
    bn: 'অভিজ্ঞতার অতিরিক্ত প্রমাণ প্রয়োজন',
    en: 'Additional Proof of Experience Needed',
  },
] as const;

/**
 * Tutor verification queue: pending dossiers with inline review decisions,
 * 3-tier qualification evidence inspection, and per-credential validation.
 */
export function AdminVerificationTab({
  tutors,
  isLoading,
  queryError,
  onRetry,
  onReview,
  onVerifyQualification,
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
  onVerifyQualification?: (input: {
    tutorId: string;
    qualificationId: string;
    reviewStatus: 'approved' | 'rejected';
  }) => Promise<void>;
}) {
  const t = useTranslations('admin');
  const locale: Locale = useLocale() === 'bn' ? 'bn' : 'en';
  const isBn = locale === 'bn';

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTERS)[number]>('all');
  const [selected, setSelected] = React.useState<PendingTutorItem | null>(null);
  const [decision, setDecision] = React.useState<TutorReviewDecision>('approved');
  const [reasonCode, setReasonCode] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [verifyingQualId, setVerifyingQualId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [previewingDoc, setPreviewingDoc] = React.useState<{
    title: string;
    filename: string;
    signedUrl?: string;
  } | null>(null);

  const [fetchDossier, dossierQuery] = useLazyGetTutorReviewDossierQuery();
  const [getFileAccess] = useLazyGetFileAccessQuery();

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
    setReasonCode('nid_verified_match');
    setNotes('');
    setFormError(null);
    setPreviewingDoc(null);
    fetchDossier(row.userId);
  }

  async function handleConfirmReview() {
    if (!selected) return;
    if (!reasonCode.trim()) {
      setFormError(isBn ? 'সিদ্ধান্তের কারণ আবশ্যক।' : 'A reason code is required.');
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
      playAudioTone(decision === 'approved' ? 'success' : 'alert');
      setSelected(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyQualification(
    qualificationId: string,
    reviewStatus: 'approved' | 'rejected',
  ) {
    if (!selected || !onVerifyQualification) return;
    setVerifyingQualId(qualificationId);
    setFormError(null);
    try {
      await onVerifyQualification({
        tutorId: selected.userId,
        qualificationId,
        reviewStatus,
      });
      playAudioTone(reviewStatus === 'approved' ? 'success' : 'alert');
      fetchDossier(selected.userId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifyingQualId(null);
    }
  }

  async function handleInspectEvidence(
    title: string,
    assetId: string,
    filename?: string | null,
  ) {
    setFormError(null);
    try {
      const res = await getFileAccess(assetId).unwrap();
      const signedUrl = res.file.signedAccessUrl;
      setPreviewingDoc({
        title,
        filename: filename || res.file.originalFilename,
        signedUrl,
      });
      playAudioTone('chime');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
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
      {/* Search & Filter Header */}
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
          aria-label={isBn ? 'অবস্থা অনুযায়ী ছাঁকুন' : 'Filter by status'}
        >
          <option value="all">{isBn ? 'সব অবস্থা' : 'All statuses'}</option>
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
            isBn
              ? 'পর্যালোচনার জন্য অপেক্ষমাণ কোনো টিউটর প্রোফাইল নেই।'
              : 'No tutor profiles are waiting for review.'
          }
        />
      ) : (
        <div className="border border-border/70 rounded-2xl overflow-hidden bg-card shadow-xs">
          <table className="w-full text-left text-xs" data-testid="verification-table">
            <thead className="bg-surface text-muted-foreground border-b border-border uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">{isBn ? 'টিউটর' : 'Tutor'}</th>
                <th className="px-4 py-3">{isBn ? 'অবস্থা' : 'Status'}</th>
                <th className="px-4 py-3">{isBn ? 'সনদ' : 'Docs'}</th>
                <th className="px-4 py-3">{isBn ? 'জমার তারিখ' : 'Submitted'}</th>
                <th className="px-4 py-3 text-right">{isBn ? 'পদক্ষেপ' : 'Actions'}</th>
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

      {/* Review Dossier Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('dossierTitle')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          data-testid="verification-dossier-modal"
        >
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{selected.displayName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    {selected.verificationStatus}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.email || selected.phoneE164 || '—'}
                  {selected.headline ? ` · ${selected.headline}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
                aria-label={isBn ? 'মোডাল বন্ধ করুন' : 'Close modal'}
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
                {/* 3-Tier Verification Checklist & Qualifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      {t('dossierQualifications')} (
                      {formatLocalizedNumber(dossierQualifications.length, locale)})
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isBn ? '৩-স্তর নিরীক্ষা ডসিয়ার' : '3-Tier Verification Dossier'}
                    </span>
                  </div>

                  {dossierQualifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-xl">
                      {isBn ? 'কোনো সনদ বা প্রমাণপত্র জমা হয়নি।' : 'No credentials submitted.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {dossierQualifications.map((q) => {
                        const isApproved = q.reviewStatus === 'approved';
                        const isRejected = q.reviewStatus === 'rejected';
                        const isPending = !isApproved && !isRejected;

                        return (
                          <li
                            key={q.id}
                            className="rounded-xl border border-border/80 bg-surface/50 p-3.5 text-xs space-y-2"
                            data-testid={`dossier-qual-${q.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {q.title}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                    {q.qualificationType}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {q.institution ? `${q.institution}` : ''}
                                  {q.issuedYear ? ` · ${q.issuedYear}` : ''}
                                </p>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {isBn ? 'অনুমোদিত' : 'Approved'}
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <XCircle className="w-3 h-3" />
                                    {isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Clock className="w-3 h-3" />
                                    {isBn ? 'অপেক্ষমান' : 'Pending'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Evidence File & Validation Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                              <div className="flex items-center gap-2">
                                {q.evidenceAssetId ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInspectEvidence(
                                        q.title,
                                        q.evidenceAssetId!,
                                        q.evidenceFilename,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                    data-testid={`inspect-evidence-btn-${q.id}`}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>
                                      {q.evidenceFilename || (isBn ? 'প্রমাণপত্র দেখুন' : 'View Evidence')}
                                    </span>
                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    {isBn ? 'কোনো ফাইল সংযুক্ত নেই' : 'No file attached'}
                                  </span>
                                )}
                              </div>

                              {/* Per-credential verify buttons */}
                              {onVerifyQualification && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={verifyingQualId === q.id || isApproved}
                                    onClick={() => handleVerifyQualification(q.id, 'approved')}
                                    className="h-7 px-2.5 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                    data-testid={`approve-qual-btn-${q.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {isBn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={verifyingQualId === q.id || isRejected}
                                    onClick={() => handleVerifyQualification(q.id, 'rejected')}
                                    className="h-7 px-2.5 text-[11px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                    data-testid={`reject-qual-btn-${q.id}`}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    {isBn ? 'প্রত্যাখ্যান' : 'Reject'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Evidence Preview Box (When clicked) */}
                {previewingDoc && (
                  <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold text-cyan-300">{previewingDoc.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewingDoc(null)}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isBn ? 'ফাইল:' : 'File:'} {previewingDoc.filename}
                    </p>
                    {previewingDoc.signedUrl ? (
                      <a
                        href={previewingDoc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-medium text-xs border border-cyan-500/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isBn ? 'নিরাপদ লিংকে প্রমাণপত্র খুলুন' : 'Open Evidence via Signed URL'}
                      </a>
                    ) : (
                      <p className="text-xs text-amber-400">
                        {isBn
                          ? 'নিরাপত্তা টোকেন যাচাই সম্পন্ন হয়েছে।'
                          : 'Security token verified for this document.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Dossier Audit History */}
                {dossierHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t('dossierHistory')}
                    </h4>
                    <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                      {dossierHistory.map((h) => (
                        <li
                          key={h.id}
                          className="rounded-lg bg-surface/60 border border-border/60 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground uppercase text-[11px]">
                              {h.decision}
                            </span>
                            {h.reasonCode ? ` · ${h.reasonCode}` : ''}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(h.createdAt, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Decision Submission Form */}
            <form
              className="space-y-3 border-t border-border/80 pt-4"
              data-testid="verification-decision-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmReview();
              }}
            >
              {formError && (
                <p
                  role="alert"
                  className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2"
                  data-testid="verification-form-error"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
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
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
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
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                    data-testid="verification-reason-input"
                  />
                </div>
              </div>

              {/* Fast Preset Reason Suggestions */}
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {isBn ? 'দ্রুত কারণ নির্বাচন (Quick Reason Presets):' : 'Suggested Reason Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REASON_CODES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setReasonCode(item.code)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                        reasonCode === item.code
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-surface/60 text-muted-foreground border-border/80 hover:bg-surface hover:text-foreground'
                      }`}
                    >
                      {isBn ? item.bn : item.en}
                    </button>
                  ))}
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
                  placeholder={
                    isBn
                      ? 'অভ্যন্তরীণ পর্যবেক্ষণ বা টিউটরকে প্রদর্শিত নির্দেশিকা...'
                      : 'Internal compliance notes or reviewer feedback...'
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                  data-testid="verification-notes-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
                  {isBn ? 'বাতিল' : 'Cancel'}
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
