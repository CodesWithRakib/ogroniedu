'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { playAudioTone } from '@/lib/audio/notification-sound';
import {
  useGetOwnTutorProfileQuery,
  useGetOwnVerificationDossierQuery,
  useSetTutorPublicationMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';
import { VerificationLevelCard } from '../components/verificationLevelCard';

/**
 * Tutor verification workspace: a profile-level status hero plus one card per
 * dossier level (identity → educational → institutional). Every action calls the
 * three-level dossier API; the server decides requirements, transitions and the
 * derived overall status.
 */
export function TutorVerificationPage({ locale }: { locale: Locale }) {
  const profile = useGetOwnTutorProfileQuery();
  const dossier = useGetOwnVerificationDossierQuery();
  const [setPublication, { isLoading: publishing }] = useSetTutorPublicationMutation();

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const isBn = locale === 'bn';

  const envelope = profile.data?.data as TutorOwnProfile | { profile: TutorOwnProfile } | undefined;
  const prof: TutorOwnProfile | undefined =
    envelope && typeof envelope === 'object' && 'profile' in envelope
      ? (envelope as { profile: TutorOwnProfile }).profile
      : (envelope as TutorOwnProfile | undefined);

  const verificationStatus = String(prof?.verificationStatus ?? 'not_submitted');
  const publicationStatus = String(prof?.publicationStatus ?? 'draft');
  const isApproved = verificationStatus === 'approved';
  const isUnderReview = verificationStatus === 'submitted' || verificationStatus === 'under_review';

  const levels = dossier.data?.data?.levels ?? [];
  const approvedLevels = levels.filter((level) => level.status === 'approved').length;
  const overallExpiry = dossier.data?.data?.profile?.verificationExpiresAt ?? null;

  function handleLevelChanged() {
    dossier.refetch();
    profile.refetch();
  }

  async function handleTogglePublication() {
    setActionError(null);
    setSuccessMessage(null);
    const targetStatus = publicationStatus === 'published' ? 'draft' : 'published';
    try {
      await setPublication({ publicationStatus: targetStatus }).unwrap();
      playAudioTone(targetStatus === 'published' ? 'success' : 'chime');
      setSuccessMessage(
        targetStatus === 'published'
          ? isBn
            ? 'অভিনন্দন! আপনার প্রোফাইল এখন সবার জন্য দৃশ্যমান।'
            : 'Congratulations! Your profile is now live to all students.'
          : isBn
            ? 'আপনার প্রোফাইল খসড়া মোডে নেওয়া হয়েছে।'
            : 'Your profile is now in draft mode.',
      );
      profile.refetch();
    } catch (err) {
      setActionError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <TutorLayout
      locale={locale}
      title={isBn ? 'শিক্ষক সনদ ও ভেরিফিকেশন' : 'Tutor Verification & Credentials'}
      subtitle={
        isBn
          ? 'তিন স্তরে (পরিচয়, শিক্ষাগত ও প্রাতিষ্ঠানিক) প্রমাণপত্র যাচাই করে বিশ্বস্ত শিক্ষক ব্যাজ অর্জন করুন।'
          : 'Complete the three verification levels — identity, educational and institutional — to earn the Verified Tutor badge.'
      }
      actions={
        <div className="flex items-center gap-2">
          {isApproved && (
            <Button
              size="sm"
              variant={publicationStatus === 'published' ? 'outline' : 'default'}
              disabled={publishing}
              onClick={handleTogglePublication}
              className="text-xs"
              data-testid="toggle-publication-btn"
            >
              {publicationStatus === 'published'
                ? isBn
                  ? 'অপ্রকাশিত করুন'
                  : 'Unpublish Profile'
                : isBn
                  ? 'প্রোফাইল প্রকাশ করুন'
                  : 'Publish Profile'}
            </Button>
          )}
        </div>
      }
    >
      {actionError && (
        <Alert variant="destructive" className="mb-4" data-testid="verification-action-error">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription role="alert">{actionError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-primary/20 bg-primary-soft p-4 text-xs text-success-soft-foreground    flex items-start gap-2"
          data-testid="verification-success-message"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {profile.isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : profile.isError ? (
        <ErrorState
          message={normalizeApiError(profile.error, locale).message}
          onRetry={profile.refetch}
        />
      ) : (
        <div className="space-y-6">
          {/* Status hero */}
          <div
            className={`rounded-2xl p-6 sm:p-8 text-foreground relative overflow-hidden ${
              isApproved
                ? 'bg-card border border-brand/25 '
                : isUnderReview
                  ? 'bg-card border border-interactive/25 '
                  : 'bg-warning-soft border border-warning/25 '
            }`}
            data-testid="verification-status-hero"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  {isApproved ? (
                    <Badge variant="success" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      {isBn ? 'যাচাইকৃত শিক্ষক ব্যাজ সক্রিয়' : 'Verified Tutor Badge Active'}
                    </Badge>
                  ) : isUnderReview ? (
                    <Badge variant="info" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <Clock className="h-4 w-4" />
                      {isBn ? 'যাচাই পর্যালোচনায় রয়েছে' : 'Under Compliance Review'}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      {isBn ? 'যাচাই অসম্পূর্ণ' : 'Verification Incomplete'}
                    </Badge>
                  )}

                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                    <Layers className="w-3.5 h-3.5" />
                    {formatLocalizedNumber(approvedLevels, locale)} /{' '}
                    {formatLocalizedNumber(levels.length || 3, locale)}{' '}
                    {isBn ? 'স্তর অনুমোদিত' : 'levels approved'}
                  </span>

                  {publicationStatus === 'published' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-success-soft text-success-soft-foreground border border-success/30 font-medium">
                      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                      {isBn ? 'প্রোফাইল লাইভ' : 'Profile Live'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-muted/20 text-muted-foreground border border-border font-medium">
                      {isBn ? 'খসড়া মোড' : 'Draft Mode'}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {isApproved
                    ? isBn
                      ? 'অভিনন্দন! আপনার প্রোফাইল সম্পূর্ণ ভেরিফাইড।'
                      : 'Congratulations! Your profile is fully verified.'
                    : isUnderReview
                      ? isBn
                        ? 'আপনার সনদ কমপ্লায়েন্স টিমের কাছে জমা রয়েছে।'
                        : 'Your credentials are undergoing compliance check.'
                      : isBn
                        ? 'তিনটি স্তর সম্পন্ন করে ৩ গুণ বেশি শিক্ষার্থী আকর্ষণ করুন।'
                        : 'Complete all three levels to earn 3x more tuition requests.'}
                </h2>

                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {isApproved
                    ? isBn
                      ? 'আপনার তিনটি যাচাই স্তরই অনুমোদিত। অভিভাবক ও শিক্ষার্থীরা সার্চে আপনার ভেরিফাইড ব্যাজ দেখতে পাচ্ছেন।'
                      : 'All three verification levels are approved. Students and guardians see your verified badge in search results.'
                    : isUnderReview
                      ? isBn
                        ? 'জমা দেওয়া স্তরগুলো পর্যালোচনা করা হচ্ছে। প্রতিটি স্তরের সিদ্ধান্ত আলাদাভাবে নেওয়া হয়।'
                        : 'Submitted levels are being reviewed. Each level is decided independently and feedback appears below.'
                      : isBn
                        ? 'প্রতিটি স্তরের প্রয়োজনীয় নথি আপলোড করুন, তারপর সেই স্তরটি পর্যালোচনার জন্য জমা দিন।'
                        : 'Upload the evidence each level requires, then submit that level for review.'}
                </p>

                {overallExpiry && isApproved && (
                  <p className="text-[11px] text-muted-foreground">
                    {isBn ? 'পুনঃযাচাই প্রয়োজন' : 'Re-verification due'}:{' '}
                    {overallExpiry.slice(0, 10)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={withLocale('/dashboard/tutor', locale)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-muted hover:bg-surface-hover text-foreground text-xs font-semibold backdrop-blur-sm transition-colors"
                >
                  <span>{isBn ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {isApproved && (
                  <Link
                    href={withLocale(`/tutors/${prof?.id ?? ''}`, locale)}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs shadow-blue-500/25 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isBn ? 'পাবলিক প্রোফাইল দেখুন' : 'View Public Profile'}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Three-level dossier */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {isBn ? 'তিন-স্তরের যাচাই ডসিয়ার' : 'Three-Level Verification Dossier'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isBn
                  ? 'মানব পর্যালোচক প্রতিটি স্তর আলাদাভাবে অনুমোদন করেন। নথি আপলোড করলেই যাচাই সম্পন্ন হয় না।'
                  : 'A human reviewer approves each level separately. Uploading a document never approves a level by itself.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {dossier.isLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : dossier.isError ? (
                <ErrorState
                  message={normalizeApiError(dossier.error, locale).message}
                  onRetry={dossier.refetch}
                  testId="verification-dossier-error"
                />
              ) : levels.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {isBn
                    ? 'ডসিয়ার এখনও প্রস্তুত নয়। পৃষ্ঠাটি রিফ্রেশ করুন।'
                    : 'The dossier is not ready yet. Refresh the page.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {levels.map((level) => (
                    <VerificationLevelCard
                      key={level.level}
                      record={level}
                      locale={locale}
                      onChanged={handleLevelChanged}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data safety & encryption guarantee */}
          <div className="p-4 rounded-2xl bg-info-soft border border-info/40 flex items-start gap-3 text-xs text-info-soft-foreground">
            <Lock className="w-4 h-4 text-info-soft-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-info-soft-foreground">
                {isBn
                  ? '২৫৬-বিট এনক্রিপশন ও তথ্যের গোপনীয়তা সুরক্ষা'
                  : '256-Bit Bank Grade Encryption & Privacy Assurance'}
              </span>
              <p className="text-info-soft-foreground leading-relaxed">
                {isBn
                  ? 'আপনার জাতীয় পরিচয়পত্র ও অ্যাকাডেমিক সনদপত্র শুধুমাত্র অগ্রণী এডুর অভ্যন্তরীণ ভেরিফিকেশনের জন্য ব্যবহৃত হয়। এই নথিগুলো কখনোই শিক্ষার্থী বা তৃতীয় পক্ষের কাছে উন্মুক্ত করা হয় না।'
                  : 'Your NID and academic certificates are strictly used for internal verification by our compliance officers and are never disclosed to students or third parties.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}
