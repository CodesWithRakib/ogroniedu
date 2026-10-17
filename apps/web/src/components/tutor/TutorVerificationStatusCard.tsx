'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Upload,
  Globe,
  Award,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

export interface QualificationSummaryItem {
  id: string;
  title: string;
  qualificationType: string;
  institution?: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'expired';
}

interface TutorVerificationStatusCardProps {
  locale: Locale;
  verificationStatus:
    | 'not_submitted'
    | 'submitted'
    | 'under_review'
    | 'needs_information'
    | 'approved'
    | 'rejected'
    | 'suspended';
  publicationStatus: 'draft' | 'published' | 'unpublished';
  qualifications?: QualificationSummaryItem[];
  onSubmitVerification?: () => Promise<void>;
  onTogglePublication?: (targetStatus: 'draft' | 'published') => Promise<void>;
}

export function TutorVerificationStatusCard({
  locale,
  verificationStatus,
  publicationStatus,
  qualifications = [],
  onSubmitVerification,
  onTogglePublication,
}: TutorVerificationStatusCardProps) {
  const dict = getDictionary(locale);
  const t = dict.tutor;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Dynamic badge calculation: only checks actually performed
  const isIdentityVerified = qualifications.some(
    (q) => q.qualificationType === 'nid' && q.reviewStatus === 'approved',
  );
  const isAcademicVerified = qualifications.some(
    (q) =>
      (q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree') &&
      q.reviewStatus === 'approved',
  );
  const isTutorApproved = verificationStatus === 'approved';

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1.5 py-1 px-3">
            <CheckCircle className="h-4 w-4" />
            {t.statusApproved}
          </Badge>
        );
      case 'submitted':
      case 'under_review':
        return (
          <Badge variant="info" className="gap-1.5 py-1 px-3">
            <Clock className="h-4 w-4" />
            {t.statusSubmitted}
          </Badge>
        );
      case 'needs_information':
        return (
          <Badge variant="warning" className="gap-1.5 py-1 px-3">
            <AlertTriangle className="h-4 w-4" />
            {t.statusNeedsInformation}
          </Badge>
        );
      case 'rejected':
      case 'suspended':
        return (
          <Badge variant="destructive" className="gap-1.5 py-1 px-3">
            <ShieldAlert className="h-4 w-4" />
            {verificationStatus === 'suspended' ? t.statusSuspended : t.statusRejected}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <Clock className="h-4 w-4" />
            {t.statusNotSubmitted}
          </Badge>
        );
    }
  };

  const handlePublishToggle = async () => {
    setErrorNotice(null);
    if (!isTutorApproved && publicationStatus !== 'published') {
      setErrorNotice(t.publicationWarning);
      return;
    }

    try {
      setIsSubmitting(true);
      const target = publicationStatus === 'published' ? 'draft' : 'published';
      if (onTogglePublication) {
        await onTogglePublication(target);
      }
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    setErrorNotice(null);
    try {
      setIsSubmitting(true);
      if (onSubmitVerification) {
        await onSubmitVerification();
      }
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-bold tracking-tight">
              {t.verificationStatusTitle}
            </CardTitle>
          </div>
          <CardDescription>
            {locale === 'bn'
              ? 'অগ্রণী এডু নিরাপত্তা ও শিক্ষাগত যাচাইকরণ ড্যাশবোর্ড'
              : 'OgroniEdu Trust, Safety & Credential Verification Dashboard'}
          </CardDescription>
        </div>
        <div>{getStatusBadge()}</div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {errorNotice && (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <AlertTitle>
                {locale === 'bn' ? 'অপারেশন ব্যর্থ হয়েছে' : 'Operation Prohibited'}
              </AlertTitle>
              <AlertDescription role="alert">{errorNotice}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Dynamic Verification Badges (Definition of Done: Only checks actually performed) */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === 'bn' ? 'যাচাইকৃত ব্যাজসমূহ' : 'Verified Badges Earned'}
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {isTutorApproved && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary  border border-primary/20">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {t.badgeVerifiedTutor}
              </span>
            )}
            {isIdentityVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-interactive/10 text-interactive  border border-interactive/20">
                <CheckCircle className="h-3.5 w-3.5 text-interactive" />
                {t.badgeVerifiedIdentity}
              </span>
            )}
            {isAcademicVerified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-interactive/10 text-interactive  border border-interactive/30">
                <Award className="h-3.5 w-3.5 text-interactive" />
                {t.badgeVerifiedAcademic}
              </span>
            )}
            {!isTutorApproved && !isIdentityVerified && !isAcademicVerified && (
              <span className="text-xs text-muted-foreground italic">
                {locale === 'bn'
                  ? 'কোনো যাচাইকরণ ব্যাজ অর্জিত হয়নি (সনদপত্র যাচাই সম্পন্ন করুন)'
                  : 'No verified badges yet (complete credential review to earn trust badges)'}
              </span>
            )}
          </div>
        </div>

        {/* Publication Control & Gate */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/80 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{t.publicationStatus}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {publicationStatus === 'published' ? t.published : t.draft}
            </p>
          </div>
          <Button
            variant={publicationStatus === 'published' ? 'outline' : 'primary'}
            size="sm"
            disabled={isSubmitting}
            onClick={handlePublishToggle}
          >
            {publicationStatus === 'published'
              ? locale === 'bn'
                ? 'অপ্রকাশিত করুন'
                : 'Unpublish Profile'
              : locale === 'bn'
                ? 'প্রোফাইল প্রকাশ করুন'
                : 'Publish Profile'}
          </Button>
        </div>

        {/* Uploaded Qualifications List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.qualificationsTitle}
            </h4>
            <span className="text-xs text-muted-foreground">
              {qualifications.length} {locale === 'bn' ? 'টি নথি আপলোডকৃত' : 'documents uploaded'}
            </span>
          </div>

          <div className="space-y-2">
            {qualifications.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground text-xs">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {locale === 'bn'
                  ? 'এখনও কোনো সনদ বা এনআইডি নথি আপলোড করা হয়নি।'
                  : 'No credentials or identity documents uploaded yet.'}
              </div>
            ) : (
              qualifications.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">{q.title}</p>
                    <p className="text-muted-foreground">{q.institution || q.qualificationType}</p>
                  </div>
                  <Badge
                    variant={
                      q.reviewStatus === 'approved'
                        ? 'success'
                        : q.reviewStatus === 'rejected'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {q.reviewStatus}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Submission Action */}
        {verificationStatus !== 'approved' && (
          <div className="pt-2">
            <Button
              className="w-full gap-2"
              disabled={isSubmitting || verificationStatus === 'submitted'}
              onClick={handleSubmitForReview}
            >
              <Upload className="h-4 w-4" />
              {t.submitForVerification}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
