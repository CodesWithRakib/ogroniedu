'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import type { VerificationDocumentType } from '@ogroniedu/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Input,
  NativeSelect,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { playAudioTone } from '@/lib/audio/notification-sound';
import {
  ACCEPTED_EVIDENCE_MIME,
  MAX_EVIDENCE_BYTES,
  evidenceMimeOf,
  fileToBase64,
} from '@/lib/evidence-file';
import { useUploadEvidenceMutation } from '@/store/services/files-api';
import {
  useAddVerificationDocumentMutation,
  useDeleteVerificationDocumentMutation,
  useReopenVerificationLevelMutation,
  useSubmitVerificationLevelMutation,
  type VerificationLevelView,
} from '@/store/services/tutors-api';
import {
  allowedDocumentTypes,
  canReopenLevel,
  canSubmitLevel,
  documentTypeLabel,
  isEvidenceEditable,
  levelLabel,
  levelStatusLabel,
  levelStatusTone,
  missingDocumentLabels,
  missingUploadLabels,
  nextActionLabel,
} from '../utils/verification-ui';

const DOC_STATUS_LABEL: Record<string, { en: string; bn: string }> = {
  pending: { en: 'Pending review', bn: 'পর্যালোচনার অপেক্ষায়' },
  approved: { en: 'Approved', bn: 'অনুমোদিত' },
  rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
  superseded: { en: 'Replaced', bn: 'প্রতিস্থাপিত' },
};

/**
 * One dossier level: mandatory-evidence checklist, private uploads, reviewer
 * feedback and the submit/reopen actions. All actions call the dossier API and
 * the server re-validates requirements, transitions and the resubmission cap.
 */
export function VerificationLevelCard({
  record,
  locale,
  onChanged,
}: {
  record: VerificationLevelView;
  locale: Locale;
  onChanged: () => void;
}) {
  const isBn = locale === 'bn';
  const [uploadEvidence, { isLoading: uploading }] = useUploadEvidenceMutation();
  const [addDocument, { isLoading: attaching }] = useAddVerificationDocumentMutation();
  const [deleteDocument, { isLoading: deleting }] = useDeleteVerificationDocumentMutation();
  const [submitLevel, { isLoading: submitting }] = useSubmitVerificationLevelMutation();
  const [reopenLevel, { isLoading: reopening }] = useReopenVerificationLevelMutation();

  const allowedTypes = React.useMemo(() => allowedDocumentTypes(record.level), [record.level]);
  const [documentType, setDocumentType] = React.useState<VerificationDocumentType>(allowedTypes[0]);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const editable = isEvidenceEditable(record.status);
  const submittable = canSubmitLevel(record.status, record.submissionCount ?? 0);
  const missingUploads = missingUploadLabels(record.requirements, locale);
  const awaitingApproval = missingDocumentLabels(record.requirements, locale);
  const busy = uploading || attaching || deleting || submitting || reopening;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!file) {
      setError(isBn ? 'প্রমাণপত্র ফাইল নির্বাচন করুন।' : 'Choose an evidence file.');
      return;
    }
    const mime = evidenceMimeOf(file);
    if (!mime) {
      setError(
        isBn
          ? 'শুধুমাত্র PDF, JPEG, PNG বা WEBP ফাইল গ্রহণযোগ্য।'
          : 'Only PDF, JPEG, PNG, or WEBP files are accepted.',
      );
      return;
    }
    if (file.size < 1 || file.size > MAX_EVIDENCE_BYTES) {
      setError(isBn ? 'ফাইলের আকার সর্বোচ্চ ১০MB হতে হবে।' : 'File must be at most 10MB.');
      return;
    }
    try {
      const contentBase64 = await fileToBase64(file);
      const uploaded = await uploadEvidence({
        purpose: 'tutor_verification_evidence',
        originalFilename: file.name,
        mediaType: mime,
        sizeBytes: file.size,
        contentBase64,
      }).unwrap();
      await addDocument({
        level: record.level,
        documentType,
        fileAssetId: uploaded.file.id,
      }).unwrap();
      playAudioTone('chime');
      setMessage(
        isBn
          ? 'প্রমাণপত্র আপলোড হয়েছে এবং পর্যালোচনার অপেক্ষায় আছে।'
          : 'Evidence uploaded and waiting for review.',
      );
      setFile(null);
      onChanged();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleDelete(documentId: string) {
    setError(null);
    setMessage(null);
    try {
      await deleteDocument(documentId).unwrap();
      playAudioTone('alert');
      setMessage(isBn ? 'প্রমাণপত্র সরানো হয়েছে।' : 'Evidence removed.');
      onChanged();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    try {
      await submitLevel(record.level).unwrap();
      playAudioTone('success');
      setMessage(
        isBn
          ? 'স্তরটি পর্যালোচনার জন্য জমা দেওয়া হয়েছে।'
          : 'Level submitted for compliance review.',
      );
      onChanged();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleReopen() {
    setError(null);
    setMessage(null);
    try {
      await reopenLevel(record.level).unwrap();
      playAudioTone('chime');
      setMessage(
        isBn
          ? 'পুনরায় যাচাইয়ের জন্য স্তরটি খোলা হয়েছে। নতুন নথি আপলোড করুন।'
          : 'Level reopened for re-verification. Upload updated evidence.',
      );
      onChanged();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <Card
      className="rounded-2xl border-border shadow-xs"
      data-testid={`verification-level-${record.level}`}
    >
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {levelLabel(record.level, locale)}
          </CardTitle>
          <Badge
            variant={levelStatusTone(record.status)}
            data-testid={`level-status-${record.level}`}
          >
            {levelStatusLabel(record.status, locale)}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {record.expiresAt
            ? isBn
              ? `মেয়াদ শেষ: ${formatDate(record.expiresAt, locale)}`
              : `Valid until ${formatDate(record.expiresAt, locale)}`
            : nextActionLabel(record.requirements.nextAction, locale)}
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {error && (
          <p
            role="alert"
            className="text-xs text-destructive  flex items-start gap-1.5"
            data-testid={`level-error-${record.level}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}
        {message && (
          <p
            role="status"
            className="text-xs text-primary  flex items-start gap-1.5"
            data-testid={`level-message-${record.level}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{message}</span>
          </p>
        )}

        {record.applicantFeedback && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning  space-y-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {isBn ? 'পর্যালোচকের মন্তব্য' : 'Reviewer feedback'}
            </span>
            <p>{record.applicantFeedback}</p>
            {record.decisionReasonCode && (
              <p className="text-[10px] opacity-80">
                {isBn ? 'কারণ কোড' : 'Reason code'}: {record.decisionReasonCode}
              </p>
            )}
          </div>
        )}

        {missingUploads.length > 0 && (
          <div className="text-[11px] text-warning  space-y-1">
            <span className="font-semibold">
              {isBn ? 'আপলোড করা প্রয়োজন:' : 'Upload required:'}
            </span>
            <ul className="list-disc list-inside">
              {missingUploads.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {missingUploads.length === 0 && awaitingApproval.length > 0 && (
          <div className="text-[11px] text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground">
              {isBn ? 'পর্যালোচকের অনুমোদনের অপেক্ষায়:' : 'Awaiting reviewer approval:'}
            </span>
            <ul className="list-disc list-inside">
              {awaitingApproval.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Uploaded evidence */}
        <div className="space-y-2">
          {record.documents.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              {isBn ? 'এখনও কোনো প্রমাণপত্র আপলোড করা হয়নি।' : 'No evidence uploaded yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {record.documents.map((document) => {
                const statusLabel = DOC_STATUS_LABEL[document.reviewStatus] ?? {
                  en: document.reviewStatus,
                  bn: document.reviewStatus,
                };
                return (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-xs"
                    data-testid={`document-${document.id}`}
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">
                        {documentTypeLabel(document.documentType, locale)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {document.originalFilename ?? (isBn ? 'সংযুক্ত ফাইল' : 'Attached file')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          document.reviewStatus === 'approved'
                            ? 'success'
                            : document.reviewStatus === 'rejected'
                              ? 'destructive'
                              : 'warning'
                        }
                        className="text-[10px]"
                      >
                        {statusLabel[locale]}
                      </Badge>
                      {editable && document.reviewStatus !== 'superseded' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => handleDelete(document.id)}
                          aria-label={isBn ? 'প্রমাণপত্র মুছুন' : 'Remove evidence'}
                          data-testid={`delete-document-${document.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upload form */}
        {editable && (
          <form
            className="space-y-2 border-t border-border pt-3"
            onSubmit={handleUpload}
            data-testid={`upload-form-${record.level}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor={`document-type-${record.level}`}
                  className="text-muted-foreground font-medium text-[11px]"
                >
                  {isBn ? 'নথির ধরন' : 'Document type'}
                </Label>
                <NativeSelect
                  id={`document-type-${record.level}`}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as VerificationDocumentType)}
                  className="h-9 text-xs"
                  data-testid={`document-type-${record.level}`}
                >
                  {allowedTypes.map((type) => (
                    <option key={type} value={type}>
                      {documentTypeLabel(type, locale)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`document-file-${record.level}`}
                  className="text-muted-foreground font-medium text-[11px]"
                >
                  {isBn ? 'ফাইল (সর্বোচ্চ ১০MB)' : 'File (max 10MB)'}
                </Label>
                <Input
                  id={`document-file-${record.level}`}
                  type="file"
                  accept={ACCEPTED_EVIDENCE_MIME.join(',')}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[11px] h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-muted file:text-foreground"
                  data-testid={`document-file-${record.level}`}
                />
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              isLoading={busy}
              data-testid={`upload-document-${record.level}`}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              {isBn ? 'প্রমাণপত্র আপলোড করুন' : 'Upload evidence'}
            </Button>
          </form>
        )}

        {/* Level actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatLocalizedNumber(record.submissionCount ?? 0, locale)}{' '}
            {isBn ? 'বার জমা দেওয়া হয়েছে' : 'submission(s)'}
          </span>
          <div className="flex items-center gap-2">
            {canReopenLevel(record.status) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={handleReopen}
                data-testid={`reopen-level-${record.level}`}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                {isBn ? 'পুনরায় যাচাই' : 'Re-verify'}
              </Button>
            )}
            {submittable && (
              <Button
                type="button"
                size="sm"
                disabled={busy || !record.requirements.submitReady}
                onClick={handleSubmit}
                data-testid={`submit-level-${record.level}`}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {isBn ? 'পর্যালোচনার জন্য জমা দিন' : 'Submit for review'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
