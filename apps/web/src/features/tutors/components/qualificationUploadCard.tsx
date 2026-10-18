'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  NativeSelect,
} from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { useUploadEvidenceMutation, type EvidencePurpose } from '@/store/services/files-api';
import { useAddTutorQualificationMutation } from '@/store/services/tutors-api';
import { playAudioTone } from '@/lib/audio/notification-sound';

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024;

type AllowedMime = (typeof ACCEPTED_MIME)[number];

function mimeOf(file: File): AllowedMime | null {
  return (ACCEPTED_MIME as readonly string[]).includes(file.type)
    ? (file.type as AllowedMime)
    : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? (result.split(',').pop() ?? '') : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Tutor credential evidence upload: file (≤10MB PDF/JPEG/PNG/WEBP) is
 * registered via POST /files/upload-evidence, then linked as a tutor
 * qualification with the returned evidence asset id. No mock uploads —
 * both steps hit the real backend and surface server errors.
 */
export function QualificationUploadCard({
  locale,
  onUploaded,
}: {
  locale: Locale;
  onUploaded?: () => void;
}) {
  const [uploadEvidence, { isLoading: uploading }] = useUploadEvidenceMutation();
  const [addQualification, { isLoading: linking }] = useAddTutorQualificationMutation();
  const [docType, setDocType] = React.useState<'nid' | 'academic_certificate' | 'degree'>('nid');
  const [title, setTitle] = React.useState('');
  const [institution, setInstitution] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);

  const isBn = locale === 'bn';
  const busy = uploading || linking;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(null);
    if (!file) {
      setFormError(isBn ? 'প্রমাণপত্র ফাইল নির্বাচন করুন।' : 'Choose an evidence file.');
      return;
    }
    const mime = mimeOf(file);
    if (!mime) {
      setFormError(
        isBn
          ? 'শুধুমাত্র PDF, JPEG, PNG বা WEBP ফাইল গ্রহণযোগ্য।'
          : 'Only PDF, JPEG, PNG, or WEBP files are accepted.',
      );
      return;
    }
    if (file.size < 1 || file.size > MAX_BYTES) {
      setFormError(isBn ? 'ফাইলের আকার সর্বোচ্চ ১০MB হতে হবে।' : 'File must be at most 10MB.');
      return;
    }
    if (title.trim().length < 2) {
      setFormError(isBn ? 'সনদের শিরোনাম দিন।' : 'Enter the credential title.');
      return;
    }
    try {
      const contentBase64 = await fileToBase64(file);
      const uploaded = await uploadEvidence({
        purpose: docType as EvidencePurpose,
        originalFilename: file.name,
        mediaType: mime,
        sizeBytes: file.size,
        contentBase64,
      }).unwrap();
      await addQualification({
        qualificationType: docType,
        title: title.trim(),
        institution: institution.trim() || undefined,
        evidenceAssetId: uploaded.file.id,
      }).unwrap();
      playAudioTone('chime');
      setSaved(
        isBn
          ? 'সনদ আপলোড হয়েছে এবং যাচাইয়ের জন্য জমা হয়েছে।'
          : 'Credential uploaded and queued for verification review.',
      );
      setTitle('');
      setInstitution('');
      setFile(null);
      onUploaded?.();
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {isBn ? 'সনদপত্র আপলোড' : 'Upload credential evidence'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3" data-testid="qualification-upload-form">
          {formError && (
            <p
              role="alert"
              className="text-xs text-destructive"
              data-testid="qualification-upload-error"
            >
              {formError}
            </p>
          )}
          {saved && (
            <p
              role="status"
              className="text-xs text-primary"
              data-testid="qualification-upload-saved"
            >
              {saved}
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="qual-doc-type" className="text-xs font-medium">
              {isBn ? 'সনদের ধরন' : 'Document type'}
            </Label>
            <NativeSelect
              id="qual-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value as typeof docType)}
              data-testid="qualification-type-select"
            >
              <option value="nid">{isBn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}</option>
              <option value="academic_certificate">
                {isBn ? 'একাডেমিক সনদপত্র' : 'Academic certificate'}
              </option>
              <option value="degree">{isBn ? 'ডিগ্রি' : 'Degree'}</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qual-title" className="text-xs font-medium">
              {isBn ? 'শিরোনাম' : 'Title'}
            </Label>
            <Input
              id="qual-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBn ? 'যেমন: BSc in CSE, DU' : 'e.g. BSc in CSE, DU'}
              data-testid="qualification-title-input"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qual-institution" className="text-xs font-medium">
              {isBn ? 'প্রতিষ্ঠান (ঐচ্ছিক)' : 'Institution (optional)'}
            </Label>
            <Input
              id="qual-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              data-testid="qualification-institution-input"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qual-file" className="text-xs font-medium">
              {isBn
                ? 'ফাইল (PDF/JPEG/PNG/WEBP, সর্বোচ্চ ১০MB)'
                : 'File (PDF/JPEG/PNG/WEBP, max 10MB)'}
            </Label>
            <Input
              id="qual-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-muted file:text-foreground"
              data-testid="qualification-file-input"
            />
          </div>
          <Button type="submit" size="sm" isLoading={busy} data-testid="qualification-upload-btn">
            {isBn ? 'আপলোড ও জমা দিন' : 'Upload & submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
