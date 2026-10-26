'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Search,
} from 'lucide-react';
import type { TutorVerificationLevel } from '@ogroniedu/contracts';
import {
  Badge,
  StatusBadge,
  Button,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { normalizeApiError } from '@/lib/api-error';
import {
  useAssignVerificationLevelMutation,
  useDecideVerificationLevelMutation,
  useGetVerificationDossierQuery,
  useGetVerificationQueueQuery,
  useLazyGetVerificationDocumentAccessQuery,
  useVerifyVerificationDocumentMutation,
  type TutorReviewDecision,
  type VerificationQueueRow,
} from '@/store/services/admin-api';
import {
  documentTypeLabel,
  levelLabel,
  levelStatusLabel,
  levelStatusTone,
  missingDocumentLabels,
  nextActionLabel,
} from '../../../tutors/utils/verification-ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const LEVELS: TutorVerificationLevel[] = ['identity', 'educational', 'institutional'];

const STATUS_FILTERS = [
  'all',
  'submitted',
  'under_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended',
  'expired',
] as const;

const DECISIONS: TutorReviewDecision[] = [
  'approved',
  'rejected',
  'needs_information',
  'suspended',
  'reinstated',
];

const DECISION_LABELS: Record<TutorReviewDecision, { en: string; bn: string }> = {
  approved: { en: 'Approved', bn: 'অনুমোদিত' },
  rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
  needs_information: { en: 'Information needed', bn: 'তথ্য প্রয়োজন' },
  suspended: { en: 'Suspended', bn: 'স্থগিত' },
  reinstated: { en: 'Reinstated', bn: 'পুনর্বহাল' },
};

const PRESET_REASON_CODES = [
  {
    code: 'nid_verified_match',
    bn: 'পরিচয় ও সনদ যাচাই সম্পন্ন',
    en: 'Identity & credentials verified',
  },
  {
    code: 'degree_verified',
    bn: 'স্বীকৃত বিশ্ববিদ্যালয়ের ডিগ্রি যাচাই',
    en: 'Accredited degree verified',
  },
  { code: 'photo_mismatch', bn: 'ছবি বা তথ্যে অসঙ্গতি', en: 'Photo/identity mismatch' },
  { code: 'illegible_document', bn: 'নথি অস্পষ্ট বা অপাঠ্য', en: 'Illegible document' },
  { code: 'unrecognized_institution', bn: 'অস্বীকৃত প্রতিষ্ঠান', en: 'Unrecognized institution' },
  { code: 'document_expired', bn: 'নথির মেয়াদ শেষ', en: 'Document expired' },
] as const;

function absoluteSignedUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

/**
 * Presentational queue table. Kept separate from the data-fetching tab so the
 * row/empty rendering can be tested without a live API.
 */
export function VerificationQueueTable({
  rows,
  locale,
  onOpen,
}: {
  rows: VerificationQueueRow[];
  locale: Locale;
  onOpen: (row: VerificationQueueRow) => void;
}) {
  const isBn = locale === 'bn';
  if (rows.length === 0) {
    return (
      <EmptyState
        title={isBn ? 'পর্যালোচনার অপেক্ষায় কিছু নেই' : 'Nothing waiting for review'}
        description={
          isBn
            ? 'এই ফিল্টারে কোনো যাচাই স্তর অপেক্ষমাণ নেই।'
            : 'No verification level matches the current filters.'
        }
      />
    );
  }
  return (
    <div className="border border-border rounded-2xl overflow-x-auto bg-card shadow-xs">
      <Table data-testid="verification-table">
        <TableHeader>
          <TableRow className="uppercase tracking-wider text-[11px] font-bold">
            <TableHead className="px-4 py-3.5">{isBn ? 'টিউটর' : 'Tutor'}</TableHead>
            <TableHead className="px-4 py-3.5">{isBn ? 'স্তর' : 'Level'}</TableHead>
            <TableHead className="px-4 py-3.5">{isBn ? 'অবস্থা' : 'Status'}</TableHead>
            <TableHead className="px-4 py-3.5">{isBn ? 'নথি' : 'Docs'}</TableHead>
            <TableHead className="px-4 py-3.5">{isBn ? 'জমা' : 'Submitted'}</TableHead>
            <TableHead className="px-4 py-3.5 text-right">{isBn ? 'পদক্ষেপ' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-foreground text-xs">
          {rows.map((row) => (
            <TableRow
              key={`${row.tutorUserId}:${row.level}`}
              className="hover:bg-muted/40 transition-colors"
              data-testid={`verification-row-${row.tutorUserId}-${row.level}`}
            >
              <TableCell className="px-4 py-3 font-medium">
                {row.displayName}
                <span className="block text-[11px] text-muted-foreground font-normal">
                  {row.headline || row.email || '—'}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3">{levelLabel(row.level, locale)}</TableCell>
              <TableCell className="px-4 py-3">
                <StatusBadge status={row.levelStatus} size="sm">
                  {levelStatusLabel(row.levelStatus, locale)}
                </StatusBadge>
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {formatLocalizedNumber(row.pendingDocuments, locale)}{' '}
                {isBn ? 'অপেক্ষমান' : 'pending'}
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {row.submittedAt ? formatDate(row.submittedAt, locale) : '—'}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Link
                  href={withLocale(`/dashboard/admin/verification/${row.tutorUserId}`, locale)}
                  data-testid={`review-tutor-btn-${row.tutorUserId}-${row.level}`}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  {isBn ? 'পর্যালোচনা' : 'Review'}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function docStatusLabel(status: string, isBn: boolean): string {
  const labels: Record<string, { en: string; bn: string }> = {
    pending: { en: 'Pending', bn: 'অপেক্ষমান' },
    approved: { en: 'Approved', bn: 'অনুমোদিত' },
    rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
    superseded: { en: 'Replaced', bn: 'প্রতিস্থাপিত' },
  };
  return labels[status]?.[isBn ? 'bn' : 'en'] ?? status;
}

/**
 * Compliance review queue for the three-level verification dossier.
 *
 * One row per level awaiting a decision. Reviewers inspect private evidence via
 * the reviewer-scoped signed-access route (never the generic file route),
 * approve/reject individual documents, then decide the level. The API re-checks
 * assignment scope, mandatory evidence, self-approval and the level version.
 */
export function AdminVerificationTab() {
  const router = useRouter();
  const locale: Locale = useLocale() === 'bn' ? 'bn' : 'en';
  const isBn = locale === 'bn';

  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTERS)[number]>('all');
  const [levelFilter, setLevelFilter] = React.useState<TutorVerificationLevel | 'all'>('all');
  const [assignment, setAssignment] = React.useState<'any' | 'assigned_to_me' | 'unassigned'>(
    'any',
  );
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queue = useGetVerificationQueueQuery({
    q: search || undefined,
    status: statusFilter,
    level: levelFilter === 'all' ? undefined : levelFilter,
    assignment: assignment === 'any' ? undefined : assignment,
    page,
    pageSize: 20,
  });

  const [selected, setSelected] = React.useState<VerificationQueueRow | null>(null);
  const [selectedLevel, setSelectedLevel] = React.useState<TutorVerificationLevel | null>(null);
  const [decision, setDecision] = React.useState<TutorReviewDecision>('approved');
  const [reasonCode, setReasonCode] = React.useState('nid_verified_match');
  const [applicantFeedback, setApplicantFeedback] = React.useState('');
  const [internalNotes, setInternalNotes] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ label: string; url: string } | null>(null);

  const dossier = useGetVerificationDossierQuery(selected?.tutorUserId ?? '', {
    skip: !selected,
  });
  const [fetchAccess, accessState] = useLazyGetVerificationDocumentAccessQuery();
  const [verifyDocument, { isLoading: verifyingDoc }] = useVerifyVerificationDocumentMutation();
  const [decideLevel, { isLoading: deciding }] = useDecideVerificationLevelMutation();
  const [assignLevel, { isLoading: assigning }] = useAssignVerificationLevelMutation();

  const rows = queue.data?.data ?? [];
  const pagination = queue.data?.meta?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  function openDossier(row: VerificationQueueRow) {
    router.push(withLocale(`/dashboard/admin/verification/${row.tutorUserId}`, locale));
  }

  const dossierLevels = dossier.data?.data?.levels ?? [];
  const activeLevel = dossierLevels.find((lvl) => lvl.level === selectedLevel);

  async function handlePreview(documentId: string, label: string) {
    if (!selected) return;
    setFormError(null);
    try {
      const res = await fetchAccess({
        tutorId: selected.tutorUserId,
        documentId,
      }).unwrap();
      setPreview({ label, url: absoluteSignedUrl(res.data.signedAccessUrl) });
      playAudioTone('chime');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleVerifyDocument(documentId: string, reviewStatus: 'approved' | 'rejected') {
    if (!selected) return;
    setFormError(null);
    try {
      await verifyDocument({
        tutorId: selected.tutorUserId,
        documentId,
        reviewStatus,
        reasonCode: reviewStatus === 'rejected' ? reasonCode || undefined : undefined,
      }).unwrap();
      playAudioTone(reviewStatus === 'approved' ? 'success' : 'alert');
      dossier.refetch();
      queue.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDecide(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !activeLevel) return;
    if (!reasonCode.trim()) {
      setFormError(isBn ? 'সিদ্ধান্তের কারণ আবশ্যক।' : 'A reason code is required.');
      return;
    }
    if (decision !== 'approved' && decision !== 'reinstated' && !applicantFeedback.trim()) {
      setFormError(
        isBn
          ? 'এই সিদ্ধান্তের জন্য শিক্ষককে দেখানোর মতো ফিডব্যাক আবশ্যক।'
          : 'Applicant-facing feedback is required for this decision.',
      );
      return;
    }
    setFormError(null);
    try {
      await decideLevel({
        tutorId: selected.tutorUserId,
        level: activeLevel.level,
        decision,
        reasonCode: reasonCode.trim(),
        applicantFeedback: applicantFeedback.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        expectedVersion: activeLevel.version,
      }).unwrap();
      playAudioTone(decision === 'approved' ? 'success' : 'alert');
      dossier.refetch();
      queue.refetch();
      setApplicantFeedback('');
      setInternalNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAssign() {
    if (!selected || !activeLevel) return;
    setFormError(null);
    try {
      await assignLevel({
        tutorId: selected.tutorUserId,
        level: activeLevel.level,
      }).unwrap();
      playAudioTone('chime');
      dossier.refetch();
      queue.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  if (queue.isLoading) return <LoadingState testId="verification-loading" />;
  if (queue.isError) {
    return (
      <ErrorState
        message={normalizeApiError(queue.error, locale).message}
        onRetry={queue.refetch}
        testId="verification-error"
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="verification-tab-content">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isBn ? 'নাম, ইমেইল বা হেডলাইন খুঁজুন' : 'Search name, email or headline'}
            leadingIcon={<Search className="w-4 h-4 text-muted-foreground/70" />}
            className="w-full sm:w-72 rounded-2xl"
            data-testid="verification-search-input"
          />
          <NativeSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            wrapperClassName="w-auto"
            className="h-11 text-xs"
            aria-label={isBn ? 'অবস্থা অনুযায়ী ছাঁকুন' : 'Filter by status'}
            data-testid="verification-status-filter"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'all'
                  ? isBn
                    ? 'সব অবস্থা'
                    : 'All statuses'
                  : levelStatusLabel(status, locale)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <NativeSelect
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as TutorVerificationLevel | 'all');
              setPage(1);
            }}
            wrapperClassName="w-auto"
            className="h-11 text-xs"
            aria-label={isBn ? 'স্তর অনুযায়ী ছাঁকুন' : 'Filter by level'}
            data-testid="verification-level-filter"
          >
            <option value="all">{isBn ? 'সব স্তর' : 'All levels'}</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level, locale)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={assignment}
            onChange={(e) => {
              setAssignment(e.target.value as typeof assignment);
              setPage(1);
            }}
            wrapperClassName="w-auto"
            className="h-11 text-xs"
            aria-label={isBn ? 'অ্যাসাইনমেন্ট অনুযায়ী ছাঁকুন' : 'Filter by assignment'}
            data-testid="verification-assignment-filter"
          >
            <option value="any">{isBn ? 'সব কেস' : 'All cases'}</option>
            <option value="unassigned">{isBn ? 'অ্যাসাইন হয়নি' : 'Unassigned'}</option>
            <option value="assigned_to_me">{isBn ? 'আমার কাছে' : 'Assigned to me'}</option>
          </NativeSelect>
        </div>
      </div>

      <VerificationQueueTable rows={rows} locale={locale} onOpen={openDossier} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            data-testid="verification-prev-page"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {isBn ? 'আগের' : 'Previous'}
          </Button>
          <span>
            {formatLocalizedNumber(page, locale)} / {formatLocalizedNumber(totalPages, locale)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            data-testid="verification-next-page"
          >
            {isBn ? 'পরের' : 'Next'}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Dossier modal */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent
            aria-label={isBn ? 'ভেরিফিকেশন ডসিয়ার' : 'Verification dossier'}
            className="max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            data-testid="verification-dossier-modal"
          >
            <DialogHeader className="border-b border-border pb-3 text-left">
              <DialogTitle className="text-lg font-bold text-foreground">
                {selected.displayName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {selected.email || selected.phoneE164 || '—'}
                {selected.headline ? ` · ${selected.headline}` : ''}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={levelStatusTone(selected.overallVerificationStatus as never)}>
                  {isBn ? 'সার্বিক' : 'Overall'}: {selected.overallVerificationStatus}
                </Badge>
                <Badge variant="info">
                  {isBn ? 'পাবলিকেশন' : 'Publication'}: {selected.publicationStatus}
                </Badge>
              </div>
            </DialogHeader>

            {dossier.isFetching ? (
              <LoadingState testId="dossier-loading" />
            ) : dossier.isError ? (
              <Alert variant="destructive">
                <AlertDescription role="alert">
                  {normalizeApiError(dossier.error, locale).message}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {dossierLevels.map((lvl) => {
                  const missing = missingDocumentLabels(lvl.requirements, locale);
                  return (
                    <section
                      key={lvl.level}
                      className={`rounded-2xl border p-3.5 space-y-2 ${
                        lvl.level === selectedLevel
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-surface/40'
                      }`}
                      data-testid={`dossier-level-${lvl.level}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-sky-600" />
                          <span className="text-sm font-semibold">
                            {levelLabel(lvl.level, locale)}
                          </span>
                          <Badge
                            variant={levelStatusTone(lvl.status)}
                            className="text-[10px]"
                            data-testid={`dossier-level-status-${lvl.level}`}
                          >
                            {levelStatusLabel(lvl.status, locale)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            v{formatLocalizedNumber(lvl.version, locale)}
                          </span>
                          <Button
                            size="sm"
                            variant={lvl.level === selectedLevel ? 'default' : 'outline'}
                            onClick={() => {
                              setSelectedLevel(lvl.level);
                              setFormError(null);
                            }}
                            data-testid={`select-level-${lvl.level}`}
                          >
                            {isBn ? 'সিদ্ধান্ত দিন' : 'Decide'}
                          </Button>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {missing.length > 0
                          ? `${isBn ? 'বাকি:' : 'Outstanding:'} ${missing.join(', ')}`
                          : nextActionLabel(lvl.requirements.nextAction, locale)}
                        {lvl.expiresAt
                          ? ` · ${isBn ? 'মেয়াদ' : 'Valid until'} ${formatDate(lvl.expiresAt, locale)}`
                          : ''}
                      </p>

                      {lvl.applicantFeedback && (
                        <p className="text-[11px] text-warning ">
                          {isBn ? 'শিক্ষককে পাঠানো ফিডব্যাক' : 'Applicant feedback'}:{' '}
                          {lvl.applicantFeedback}
                        </p>
                      )}
                      {lvl.internalNotes && (
                        <p className="text-[11px] text-muted-foreground italic">
                          {isBn ? 'অভ্যন্তরীণ নোট' : 'Internal note'}: {lvl.internalNotes}
                        </p>
                      )}

                      {lvl.documents.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                          {isBn ? 'কোনো প্রমাণপত্র নেই।' : 'No evidence attached.'}
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {lvl.documents.map((document) => (
                            <li
                              key={document.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-[11px]"
                              data-testid={`dossier-document-${document.id}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                                <span className="font-medium">
                                  {documentTypeLabel(document.documentType, locale)}
                                </span>
                                <Badge
                                  variant={
                                    document.reviewStatus === 'approved'
                                      ? 'success'
                                      : document.reviewStatus === 'rejected'
                                        ? 'destructive'
                                        : 'warning'
                                  }
                                  className="text-[10px]"
                                  data-testid={`doc-status-${document.id}`}
                                >
                                  {docStatusLabel(document.reviewStatus, isBn)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={accessState.isFetching}
                                  onClick={() =>
                                    handlePreview(
                                      document.id,
                                      documentTypeLabel(document.documentType, locale),
                                    )
                                  }
                                  data-testid={`inspect-evidence-btn-${document.id}`}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {isBn ? 'দেখুন' : 'View'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={verifyingDoc || document.reviewStatus === 'superseded'}
                                  onClick={() => handleVerifyDocument(document.id, 'approved')}
                                  data-testid={`approve-doc-btn-${document.id}`}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {isBn ? 'অনুমোদন' : 'Approve'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={verifyingDoc || document.reviewStatus === 'superseded'}
                                  onClick={() => handleVerifyDocument(document.id, 'rejected')}
                                  data-testid={`reject-doc-btn-${document.id}`}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {isBn ? 'প্রত্যাখ্যান' : 'Reject'}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}

                {preview && (
                  <div className="rounded-xl border border-sky-300 bg-sky-50 p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-950">
                        {isBn ? 'প্রমাণপত্র' : 'Evidence'}: {preview.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreview(null)}
                        className="text-slate-600 hover:text-slate-900 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 text-sky-950 hover:bg-sky-200 font-bold text-xs border border-sky-300 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-700" />
                      {isBn ? 'সাইনড লিংকে খুলুন (৫ মিনিট)' : 'Open signed link (5 min)'}
                    </a>
                    <p className="text-[10px] text-slate-600 font-medium">
                      {isBn
                        ? 'অ্যাক্সেস অডিট লগে রেকর্ড হয়েছে।'
                        : 'Access recorded in the audit log.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Decision form */}
            <form
              className="space-y-3 border-t border-border pt-4"
              data-testid="verification-decision-form"
              onSubmit={handleDecide}
            >
              {formError && (
                <Alert variant="destructive" data-testid="verification-form-error">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription role="alert">{formError}</AlertDescription>
                </Alert>
              )}

              {!activeLevel ? (
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'সিদ্ধান্ত নিতে উপরের কোনো স্তর নির্বাচন করুন।'
                    : 'Select a level above to record a decision.'}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {isBn ? 'সিদ্ধান্ত' : 'Decision'} · {levelLabel(activeLevel.level, locale)}
                    </span>
                    {!activeLevel.assignedReviewerUserId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={assigning}
                        onClick={handleAssign}
                        data-testid="assign-to-me-btn"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        {isBn ? 'আমার কাছে নিন' : 'Assign to me'}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{isBn ? 'স্তর' : 'Level'}</Label>
                      <NativeSelect
                        value={selectedLevel ?? activeLevel.level}
                        onChange={(e) => setSelectedLevel(e.target.value as TutorVerificationLevel)}
                        data-testid="decision-level-select"
                      >
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {levelLabel(level, locale)}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {isBn ? 'সিদ্ধান্ত' : 'Decision'}
                      </Label>
                      <NativeSelect
                        value={decision}
                        onChange={(e) => setDecision(e.target.value as TutorReviewDecision)}
                        data-testid="verification-decision-select"
                      >
                        {DECISIONS.map((value) => (
                          <option key={value} value={value}>
                            {DECISION_LABELS[value][locale]}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" htmlFor="verification-reason">
                      {isBn ? 'কারণ কোড' : 'Reason code'}
                    </Label>
                    <Input
                      id="verification-reason"
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                      data-testid="verification-reason-input"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PRESET_REASON_CODES.map((preset) => (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => setReasonCode(preset.code)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            reasonCode === preset.code
                              ? 'bg-sky-100 text-sky-950 border-sky-400 font-bold shadow-2xs'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {isBn ? preset.bn : preset.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" htmlFor="verification-feedback">
                      {isBn ? 'শিক্ষককে দেখানো ফিডব্যাক' : 'Applicant-facing feedback'}
                    </Label>
                    <Textarea
                      id="verification-feedback"
                      rows={2}
                      value={applicantFeedback}
                      onChange={(e) => setApplicantFeedback(e.target.value)}
                      placeholder={
                        isBn
                          ? 'শিক্ষক এই লেখাটি তার ডসিয়ারে দেখতে পাবেন...'
                          : 'The tutor sees this text in their dossier...'
                      }
                      data-testid="verification-feedback-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium" htmlFor="verification-notes">
                      {isBn
                        ? 'অভ্যন্তরীণ নোট (শিক্ষক দেখবেন না)'
                        : 'Internal notes (never shown to tutor)'}
                    </Label>
                    <Textarea
                      id="verification-notes"
                      rows={2}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder={
                        isBn ? 'শুধুমাত্র কমপ্লায়েন্স টিমের জন্য...' : 'Reviewer-only notes...'
                      }
                      data-testid="verification-notes-input"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />v
                      {formatLocalizedNumber(activeLevel.version, locale)} ·{' '}
                      {isBn ? 'কনকারেন্সি গার্ড' : 'version guard'}
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={deciding}
                      data-testid="verification-confirm-btn"
                    >
                      {isBn ? 'সিদ্ধান্ত সংরক্ষণ করুন' : 'Record decision'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
