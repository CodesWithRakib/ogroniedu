'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Trash2,
  ExternalLink,
  Lock,
  Sparkles,
  Award,
  ArrowRight,
  Info,
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  LoadingSpinner,
} from '@/components/ui';
import { QualificationUploadCard } from '../components/qualificationUploadCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import {
  useGetOwnTutorProfileQuery,
  useSubmitTutorVerificationMutation,
  useSetTutorPublicationMutation,
  useDeleteTutorQualificationMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';

interface QualificationRow {
  id: string;
  title: string;
  qualificationType: string;
  institution: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'expired';
}

export function TutorVerificationPage({ locale }: { locale: Locale }) {
  const profile = useGetOwnTutorProfileQuery();
  const [submitVerification, { isLoading: submitting }] = useSubmitTutorVerificationMutation();
  const [setPublication, { isLoading: publishing }] = useSetTutorPublicationMutation();
  const [deleteQualification, { isLoading: deleting }] = useDeleteTutorQualificationMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBn = locale === 'bn';

  const envelope = profile.data?.data as TutorOwnProfile | { profile: TutorOwnProfile } | undefined;
  const prof: TutorOwnProfile | undefined =
    envelope && typeof envelope === 'object' && 'profile' in envelope
      ? (envelope as { profile: TutorOwnProfile }).profile
      : (envelope as TutorOwnProfile | undefined);

  const verificationStatus = String(prof?.verificationStatus ?? 'not_submitted');
  const publicationStatus = String(prof?.publicationStatus ?? 'draft');

  const rawQualifications = (prof as { qualifications?: unknown } | undefined)?.qualifications;
  const qualifications: QualificationRow[] = Array.isArray(rawQualifications)
    ? rawQualifications.flatMap((q) => {
        if (typeof q !== 'object' || q === null) return [];
        const row = q as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.title !== 'string') return [];
        const status: 'pending' | 'approved' | 'rejected' | 'expired' =
          row.reviewStatus === 'approved' ||
          row.reviewStatus === 'rejected' ||
          row.reviewStatus === 'expired'
            ? row.reviewStatus
            : 'pending';
        return [
          {
            id: row.id,
            title: row.title,
            qualificationType:
              typeof row.qualificationType === 'string' ? row.qualificationType : '',
            institution: typeof row.institution === 'string' ? row.institution : null,
            reviewStatus: status,
          },
        ];
      })
    : [];

  const hasNid = qualifications.some((q) => q.qualificationType === 'nid');
  const hasAcademic = qualifications.some(
    (q) => q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree',
  );
  const isApproved = verificationStatus === 'approved';
  const isUnderReview =
    verificationStatus === 'submitted' || verificationStatus === 'under_review';

  async function handleSubmitReview() {
    setActionError(null);
    setSuccessMessage(null);
    try {
      await submitVerification().unwrap();
      setSuccessMessage(
        isBn
          ? 'আপনার প্রোফাইল পর্যালোচনার জন্য জমা দেওয়া হয়েছে। আমাদের কমপ্লায়েন্স টিম ২৪ ঘণ্টার মধ্যে যাচাই সম্পন্ন করবে।'
          : 'Your profile has been submitted for review. Our compliance team will review it within 24 hours.',
      );
      profile.refetch();
    } catch (err) {
      setActionError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleTogglePublication() {
    setActionError(null);
    setSuccessMessage(null);
    const targetStatus = publicationStatus === 'published' ? 'draft' : 'published';
    try {
      await setPublication({ publicationStatus: targetStatus }).unwrap();
      setSuccessMessage(
        targetStatus === 'published'
          ? isBn
            ? 'অভিনন্দন! আপনার প্রোফাইল এখন সবার জন্য দৃশ্যমান।'
            : 'Congratulations! Your profile is now live to all students.'
          : isBn
            ? 'আপনার প্রোফাইল খসড়া মোডে নেওয়া হয়েছে।'
            : 'Your profile is now in draft mode.',
      );
      profile.refetch();
    } catch (err) {
      setActionError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleDeleteQual(id: string) {
    if (
      !confirm(
        isBn
          ? 'আপনি কি নিশ্চিতভাবে এই সনদটি মুছে ফেলতে চান?'
          : 'Are you sure you want to delete this qualification?',
      )
    ) {
      return;
    }
    setActionError(null);
    setSuccessMessage(null);
    try {
      await deleteQualification(id).unwrap();
      setSuccessMessage(
        isBn ? 'সনদ সফলভাবে মুছে ফেলা হয়েছে।' : 'Qualification deleted successfully.',
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
          ? 'জাতীয় পরিচয়পত্র ও শিক্ষাগত সনদ যাচাই সম্পন্ন করে বিশ্বস্ত শিক্ষক ব্যাজ অর্জন করুন।'
          : 'Verify your NID and academic credentials to earn the official Verified Tutor badge.'
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
          <Button
            size="sm"
            disabled={submitting || isUnderReview || isApproved}
            onClick={handleSubmitReview}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            data-testid="submit-verification-btn"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {isApproved
              ? isBn
                ? 'অনুমোদিত'
                : 'Approved'
              : isUnderReview
                ? isBn
                  ? 'যাচাই প্রক্রিয়াধীন'
                  : 'Under Review'
                : isBn
                  ? 'যাচাইয়ের জন্য জমা দিন'
                  : 'Submit for Review'}
          </Button>
        </div>
      }
    >
      {/* Alert / Feedback Messages */}
      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2"
          data-testid="verification-action-error"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2"
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
          {/* ======================================================== */}
          {/* 1. STATUS HERO BANNER                                    */}
          {/* ======================================================== */}
          <div
            className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden ${
              isApproved
                ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/40'
                : isUnderReview
                  ? 'bg-gradient-to-r from-cyan-950 via-blue-950 to-slate-900 border border-cyan-500/40'
                  : 'bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-500/40'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  {isApproved ? (
                    <Badge variant="success" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      {isBn ? 'যাচাইকৃত শিক্ষক ব্যাজ সক্রিয়' : 'Verified Tutor Badge Active'}
                    </Badge>
                  ) : isUnderReview ? (
                    <Badge variant="info" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <Clock className="h-4 w-4" />
                      {isBn ? 'যাচাই পর্যালোচনায় রয়েছে' : 'Under Compliance Review'}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1.5 py-1 px-3.5 text-xs font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      {isBn ? 'সনদ জমা দেওয়া প্রয়োজন' : 'Verification Incomplete'}
                    </Badge>
                  )}

                  {publicationStatus === 'published' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {isBn ? 'প্রোফাইল লাইভ' : 'Profile Live'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-medium">
                      {isBn ? 'খসড়া মোড' : 'Draft Mode'}
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
                        ? 'আপনার আবেদন অগ্রণী এডু টিমের কাছে জমা রয়েছে।'
                        : 'Your credentials are undergoing compliance check.'
                      : isBn
                        ? 'ভেরিফিকেশন সম্পন্ন করে ৩ গুণ বেশি শিক্ষার্থী আকর্ষণ করুন।'
                        : 'Complete verification to earn 3x more tuition requests.'}
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {isApproved
                    ? isBn
                      ? 'আপনার জাতীয় পরিচয়পত্র ও ডিগ্রি সনদপত্র অগ্রণী এডু কমপ্লায়েন্স টিম দ্বারা অনুমোদিত। অভিভাবক ও শিক্ষার্থীরা আপনার প্রোফাইলে ভেরিফাইড ব্যাজ দেখতে পাচ্ছেন।'
                      : 'Your NID and academic degrees have been verified. Students and guardians see your official verified badge in search results.'
                    : isUnderReview
                      ? isBn
                        ? 'আমাদের যাচাই দল আপনার আপলোডকৃত প্রমাণপত্র পর্যালোচনা করছে। সাধারণত ১২ থেকে ২৪ ঘণ্টার মধ্যে যাচাই প্রক্রিয়া সম্পন্ন হয়।'
                        : 'Our verification specialists are reviewing your submitted documents. Verification is usually completed within 12–24 hours.'
                      : isBn
                        ? 'অগ্রণী এডুর নিরাপদ ও নির্ভরযোগ্য টিচিং নেটওয়ার্কে যুক্ত হতে আপনার জাতীয় পরিচয়পত্র (NID) এবং স্নাতক/ডিগ্রি সনদপত্র আপলোড করুন।'
                        : 'To join the trusted OgroniEdu teaching community, please upload your National ID card and university degree certificate.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={withLocale('/dashboard/tutor', locale)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
                >
                  <span>{isBn ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {isApproved && (
                  <Link
                    href={withLocale(`/tutors/${prof?.id ?? ''}`, locale)}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isBn ? 'পাবলিক প্রোফাইল দেখুন' : 'View Public Profile'}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. THREE-STEP VERIFICATION CHECKLIST                     */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: NID */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasNid
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-card border-border/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  {isBn ? 'পদক্ষেপ ১' : 'Step 1'}
                </span>
                {hasNid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {isBn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {hasNid
                  ? isBn
                    ? 'NID প্রমাণপত্র আপলোড করা হয়েছে।'
                    : 'NID evidence has been uploaded.'
                  : isBn
                    ? 'শিক্ষার্থী ও অভিভাবকের নিরাপত্তার জন্য NID যাচাই আবশ্যক।'
                    : 'Mandatory background verification for student safety.'}
              </p>
            </div>

            {/* Step 2: Academic Degree */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasAcademic
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-card border-border/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  {isBn ? 'পদক্ষেপ ২' : 'Step 2'}
                </span>
                {hasAcademic ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {isBn ? 'শিক্ষাগত সনদপত্র' : 'Academic Degree'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {hasAcademic
                  ? isBn
                    ? 'বিশ্ববিদ্যালয় বা বোর্ড সনদপত্র আপলোড করা হয়েছে।'
                    : 'Degree or certificate uploaded.'
                  : isBn
                    ? 'স্নাতক বা শিক্ষাপ্রতিষ্ঠানের সনদ আপলোড করুন।'
                    : 'Upload your graduation certificate or college ID.'}
              </p>
            </div>

            {/* Step 3: Admin Review */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isApproved
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : isUnderReview
                    ? 'bg-cyan-950/20 border-cyan-500/40'
                    : 'bg-card border-border/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  {isBn ? 'পদক্ষেপ ৩' : 'Step 3'}
                </span>
                {isApproved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : isUnderReview ? (
                  <Clock className="w-5 h-5 text-cyan-500 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                )}
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {isBn ? 'কমপ্লায়েন্স অনুমোদন' : 'Compliance Approval'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isApproved
                  ? isBn
                    ? 'অভিনন্দন! আপনার ভেরিফিকেশন অনুমোদিত।'
                    : 'Your verification is officially approved.'
                  : isUnderReview
                    ? isBn
                      ? 'পর্যালোচনা চলছে। শীঘ্রই ফলাফল জানানো হবে।'
                      : 'Review in progress. You will be notified shortly.'
                    : isBn
                      ? 'সনদ আপলোডের পর "জমা দিন" বাটনে ক্লিক করুন।'
                      : 'Click "Submit for Review" once docs are uploaded.'}
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. UPLOAD NEW CREDENTIAL & EXISTING QUALIFICATIONS TABLE */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Upload Card */}
            <div className="lg:col-span-1">
              <QualificationUploadCard
                locale={locale}
                onUploaded={() => {
                  setSuccessMessage(
                    isBn
                      ? 'সনদ সফলভাবে আপলোড হয়েছে। তালিকায় দেখতে পাবেন।'
                      : 'Credential uploaded successfully.',
                  );
                  profile.refetch();
                }}
              />
            </div>

            {/* Right: Qualifications List */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-3xl bg-[#062127]/90 border border-teal-500/20 shadow-xs">
                <CardHeader className="pb-3 border-b border-teal-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-teal-400" />
                        <span>{isBn ? 'আপলোডকৃত সনদ ও ডকুমেন্টসমূহ' : 'Uploaded Credentials'}</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-teal-300/80 mt-0.5">
                        {isBn
                          ? `সর্বমোট ${formatLocalizedNumber(qualifications.length, locale)}টি সনদপত্র নথিভুক্ত রয়েছে`
                          : `${qualifications.length} credentials currently on file`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {qualifications.length === 0 ? (
                    <div className="py-12 text-center text-teal-300/60 space-y-2">
                      <FileText className="w-10 h-10 mx-auto text-teal-300/30" />
                      <p className="text-xs">
                        {isBn
                          ? 'এখনও কোনো সনদ আপলোড করা হয়নি। বামপাশের ফর্ম ব্যবহার করে NID বা সার্টিফিকেট আপলোড করুন।'
                          : 'No credentials uploaded yet. Use the form on the left to upload NID or degree certificates.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-teal-500/20">
                      {qualifications.map((q) => (
                        <div
                          key={q.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors"
                          data-testid={`qualification-row-${q.id}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{q.title}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-teal-200 border border-white/10">
                                {q.qualificationType}
                              </span>
                            </div>
                            {q.institution && (
                              <p className="text-xs text-teal-300/80">{q.institution}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {q.reviewStatus === 'approved' ? (
                              <Badge variant="success" className="gap-1 py-0.5 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                {isBn ? 'অনুমোদিত' : 'Approved'}
                              </Badge>
                            ) : q.reviewStatus === 'rejected' ? (
                              <Badge variant="destructive" className="gap-1 py-0.5 text-[11px]">
                                <AlertTriangle className="w-3 h-3" />
                                {isBn ? 'বাতিল' : 'Rejected'}
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="gap-1 py-0.5 text-[11px]">
                                <Clock className="w-3 h-3" />
                                {isBn ? 'যাচাইধীন' : 'In Review'}
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deleting}
                              onClick={() => handleDeleteQual(q.id)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 px-2"
                              title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                              data-testid={`delete-qual-${q.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Safety & Encryption Guarantee */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3 text-xs text-cyan-200">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-cyan-100">
                    {isBn
                      ? '২৫৬-বিট এনক্রিপশন ও তথ্যের গোপনীয়তা সুরক্ষা'
                      : '256-Bit Bank Grade Encryption & Privacy Assurance'}
                  </span>
                  <p className="text-cyan-300/90 leading-relaxed">
                    {isBn
                      ? 'আপনার জাতীয় পরিচয়পত্র ও অ্যাকাডেমিক সনদপত্র শুধুমাত্র অগ্রণী এডুর অভ্যন্তরীণ ভেরিফিকেশনের জন্য ব্যবহৃত হয়। এই নথিগুলো কখনোই শিক্ষার্থী বা তৃতীয় পক্ষের কাছে উন্মুক্ত করা হয় না।'
                      : 'Your NID and academic certificates are strictly used for internal verification by our compliance officers and are never disclosed to students or third parties.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}
