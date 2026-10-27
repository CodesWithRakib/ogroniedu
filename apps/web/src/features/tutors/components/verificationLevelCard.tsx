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
} from '@/components/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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
      className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
      data-testid={`verification-level-${record.level}`}
    >
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {levelLabel(record.level, locale)}
          </CardTitle>
          <Badge
            variant={levelStatusTone(record.status)}
            className="font-bold border shadow-2xs"
            data-testid={`level-status-${record.level}`}
          >
            {levelStatusLabel(record.status, locale)}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium mt-1">
          {record.expiresAt
            ? isBn
              ? `মেয়াদ শেষ: ${formatDate(record.expiresAt, locale)}`
              : `Valid until ${formatDate(record.expiresAt, locale)}`
            : nextActionLabel(record.requirements.nextAction, locale)}
        </p>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-3.5">
        {error && (
          <p
            role="alert"
            className="text-xs text-rose-900 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium flex items-start gap-1.5"
            data-testid={`level-error-${record.level}`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </p>
        )}
        {message && (
          <p
            role="status"
            className="text-xs text-emerald-950 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl font-medium flex items-start gap-1.5"
            data-testid={`level-message-${record.level}`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{message}</span>
          </p>
        )}

        {record.applicantFeedback && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex flex-col gap-1.5 shadow-2xs">
            <span className="font-bold flex items-center gap-1.5 text-amber-900">
              <Info className="w-4 h-4 text-amber-700" />
              {isBn ? 'পর্যালোচকের মন্তব্য' : 'Reviewer feedback'}
            </span>
            <p className="leading-relaxed font-medium">{record.applicantFeedback}</p>
            {record.decisionReasonCode && (
              <p className="text-[10px] font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded w-fit">
                {isBn ? 'কারণ কোড' : 'Reason code'}: {record.decisionReasonCode}
              </p>
            )}
          </div>
        )}

        {missingUploads.length > 0 && (
          <div className="text-xs text-foreground bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-1">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {isBn ? 'আপলোড করা প্রয়োজন:' : 'Upload required:'}
            </span>
            <ul className="list-disc list-inside text-muted-foreground pl-1 flex flex-col gap-0.5 font-medium">
              {missingUploads.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {missingUploads.length === 0 && awaitingApproval.length > 0 && (
          <div className="text-xs text-foreground bg-blue-50/60 border border-blue-200 p-3 rounded-xl flex flex-col gap-1">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {isBn ? 'পর্যালোচকের অনুমোদনের অপেক্ষায়:' : 'Awaiting reviewer approval:'}
            </span>
            <ul className="list-disc list-inside text-muted-foreground pl-1 flex flex-col gap-0.5 font-medium">
              {awaitingApproval.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Uploaded evidence */}
        <div className="flex flex-col gap-2">
          {record.documents.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-1">
              {isBn ? 'এখনও কোনো প্রমাণপত্র আপলোড করা হয়নি।' : 'No evidence uploaded yet.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {record.documents.map((document) => {
                const statusLabel = DOC_STATUS_LABEL[document.reviewStatus] ?? {
                  en: document.reviewStatus,
                  bn: document.reviewStatus,
                };
                return (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40/80 px-3.5 py-2.5 text-xs shadow-2xs"
                    data-testid={`document-${document.id}`}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block">
                        {documentTypeLabel(document.documentType, locale)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground font-medium truncate">
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
                        className="text-[10px] font-bold"
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
            className="flex flex-col gap-2.5 border-t border-border/40 pt-3"
            onSubmit={handleUpload}
            data-testid={`upload-form-${record.level}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor={`document-type-${record.level}`}
                  className="text-foreground font-bold text-[11px]"
                >
                  {isBn ? 'নথির ধরন' : 'Document type'}
                </Label>
                <Select
                  value={documentType}
                  onValueChange={(val) => setDocumentType(val as VerificationDocumentType)}
                >
                  <SelectTrigger
                    id={`document-type-${record.level}`}
                    className="h-9 text-xs border-border text-foreground bg-white"
                    data-testid={`document-type-${record.level}`}
                  >
                    <SelectValue
                      placeholder={isBn ? 'নথির ধরন নির্বাচন করুন' : 'Select document type'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {documentTypeLabel(type, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor={`document-file-${record.level}`}
                  className="text-foreground font-bold text-[11px]"
                >
                  {isBn ? 'ফাইল (সর্বোচ্চ ১০MB)' : 'File (max 10MB)'}
                </Label>
                <Input
                  id={`document-file-${record.level}`}
                  type="file"
                  accept={ACCEPTED_EVIDENCE_MIME.join(',')}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[11px] h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-foreground border-border text-foreground"
                  data-testid={`document-file-${record.level}`}
                />
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              isLoading={busy}
              className="border-border text-foreground hover:bg-slate-100 font-bold"
              data-testid={`upload-document-${record.level}`}
            >
              <Upload className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              {isBn ? 'প্রমাণপত্র আপলোড করুন' : 'Upload evidence'}
            </Button>
          </form>
        )}

        {/* Level actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] text-muted-foreground font-medium inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
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
                className="border-border text-foreground hover:bg-slate-100 font-bold"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs disabled:opacity-50"
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
