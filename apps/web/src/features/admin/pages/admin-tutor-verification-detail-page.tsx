'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  ExternalLink,
  Calendar,
  GraduationCap,
  BookOpen,
  UserCheck,
  Sparkles,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  Layers,
  FileSearch,
  Lock,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { useAppDispatch } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import type { TutorVerificationLevel } from '@ogroniedu/contracts';
import {
  useGetVerificationDossierQuery,
  useLazyGetVerificationDocumentAccessQuery,
  useVerifyVerificationDocumentMutation,
  useDecideVerificationLevelMutation,
  type TutorReviewDecision,
  type VerificationDossierLevel,
} from '@/store/services/admin-api';
import { useGetSubjectsQuery, useGetEducationLevelsQuery } from '@/store/services/taxonomy-api';
import {
  levelLabel,
  levelStatusLabel,
  documentTypeLabel,
} from '../../tutors/utils/verification-ui';
import {
  Button,
  Badge,
  StatusBadge,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function absoluteSignedUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

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

const WEEKDAYS = [
  { id: 0, bn: 'রবিবার', en: 'Sunday' },
  { id: 1, bn: 'সোমবার', en: 'Monday' },
  { id: 2, bn: 'মঙ্গলবার', en: 'Tuesday' },
  { id: 3, bn: 'বুধবার', en: 'Wednesday' },
  { id: 4, bn: 'বৃহস্পতিবার', en: 'Thursday' },
  { id: 5, bn: 'শুক্রবার', en: 'Friday' },
  { id: 6, bn: 'শনিবার', en: 'Saturday' },
];

export function AdminTutorVerificationDetailPage({
  locale,
  tutorId,
}: {
  locale: Locale;
  tutorId: string;
}) {
  const isBn = locale === 'bn';
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Queries
  const { data: dossierData, isLoading, refetch, error } = useGetVerificationDossierQuery(tutorId);
  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: levelsData } = useGetEducationLevelsQuery();

  // Mutations
  const [fetchAccess, { isLoading: loadingPreview }] = useLazyGetVerificationDocumentAccessQuery();
  const [verifyDocument, { isLoading: verifyingDoc }] = useVerifyVerificationDocumentMutation();
  const [decideLevel, { isLoading: deciding }] = useDecideVerificationLevelMutation();

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<
    'profile' | 'education' | 'subjects' | 'schedule' | 'documents' | 'history'
  >('profile');

  // Decision State
  const [selectedLevel, setSelectedLevel] = React.useState<TutorVerificationLevel>('identity');
  const [decision, setDecision] = React.useState<TutorReviewDecision>('approved');
  const [reasonCode, setReasonCode] = React.useState('nid_verified_match');
  const [applicantFeedback, setApplicantFeedback] = React.useState('');
  const [internalNotes, setInternalNotes] = React.useState('');
  const [decisionError, setDecisionError] = React.useState<string | null>(null);

  // Document Preview Modal State
  const [preview, setPreview] = React.useState<{ label: string; url: string } | null>(null);

  const dossier = dossierData?.data;
  const user = dossier?.user;
  const profile = dossier?.profile;
  const reviewHistory = dossier?.reviewHistory ?? [];
  const dossierLevels: VerificationDossierLevel[] =
    (dossier?.levels as VerificationDossierLevel[]) ?? [];

  // Active level in decision console
  const activeLevelData = dossierLevels.find((lvl) => lvl.level === selectedLevel);

  // Pre-select level if current activeLevel has pending review
  React.useEffect(() => {
    if (dossierLevels.length > 0 && !dossierLevels.some((l) => l.level === selectedLevel)) {
      setSelectedLevel(dossierLevels[0].level);
    }
  }, [dossierLevels, selectedLevel]);

  // Document preview handler
  async function handlePreview(documentId: string, label: string) {
    setDecisionError(null);
    try {
      const res = await fetchAccess({
        tutorId,
        documentId,
      }).unwrap();
      if (res?.data?.signedAccessUrl) {
        setPreview({ label, url: absoluteSignedUrl(res.data.signedAccessUrl) });
        playAudioTone('chime');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'নথির প্রিভিউ লোড করা যায়নি।';
      setDecisionError(msg);
    }
  }

  // Single document verify handler
  async function handleVerifyDoc(documentId: string, reviewStatus: 'approved' | 'rejected') {
    try {
      await verifyDocument({
        tutorId,
        documentId,
        reviewStatus,
        reasonCode: reviewStatus === 'approved' ? 'document_verified' : 'document_rejected',
      }).unwrap();
      playAudioTone(reviewStatus === 'approved' ? 'success' : 'alert');
      dispatch(
        enqueueToast({
          title: isBn ? 'নথি যাচাই হালনাগাদ' : 'Document verification updated',
          message: isBn
            ? `নথিটি ${reviewStatus === 'approved' ? 'অনুমোদিত' : 'বাতিল'} করা হয়েছে।`
            : `Document marked as ${reviewStatus}.`,
          type: reviewStatus === 'approved' ? 'success' : 'warning',
        }),
      );
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'যাচাই করতে সমস্যা হয়েছে।';
      setDecisionError(msg);
    }
  }

  // Submit level decision
  async function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault();
    setDecisionError(null);

    if (
      (decision === 'rejected' || decision === 'needs_information') &&
      !applicantFeedback.trim()
    ) {
      setDecisionError(
        isBn
          ? 'আবেদন বাতিল বা তথ্য সংশোধনের জন্য শিক্ষককে কারণ (Feedback) জানানো আবশ্যক।'
          : 'Applicant feedback is required when rejecting or requesting changes.',
      );
      return;
    }

    try {
      await decideLevel({
        tutorId,
        level: selectedLevel,
        decision,
        reasonCode,
        applicantFeedback: applicantFeedback.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        expectedVersion: activeLevelData?.version,
      }).unwrap();

      playAudioTone(decision === 'approved' ? 'success' : 'alert');
      dispatch(
        enqueueToast({
          title: isBn ? 'সিদ্ধান্ত কার্যকর হয়েছে' : 'Decision recorded',
          message: isBn
            ? `${levelLabel(selectedLevel, locale)} স্তর '${decision}' হিসেবে সংরক্ষিত হয়েছে।`
            : `${selectedLevel} level marked as ${decision}.`,
          type: 'success',
        }),
      );

      setApplicantFeedback('');
      setInternalNotes('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সিদ্ধান্ত জমা দিতে ব্যর্থ হয়েছে।';
      setDecisionError(msg);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout locale={locale}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !profile) {
    return (
      <AdminLayout locale={locale}>
        <div className="py-8 max-w-4xl mx-auto flex flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(withLocale('/dashboard/admin/verification', locale))}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isBn ? 'ভেরিফিকেশন কিউ-তে ফিরুন' : 'Back to Queue'}</span>
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isBn
                ? 'শিক্ষকের ডসিয়ার তথ্য পাওয়া যায়নি বা অনুমতি নেই।'
                : 'Could not load tutor verification dossier.'}
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  // Taxonomy mappers
  const subjectsMap = new Map(
    (subjectsData?.data ?? []).map((s) => [s.id, isBn ? s.nameBn || s.nameEn : s.nameEn]),
  );
  const levelsMap = new Map(
    (levelsData?.data ?? []).map((l) => [l.id, isBn ? l.nameBn || l.nameEn : l.nameEn]),
  );

  const qualifications = (profile.qualifications as Array<Record<string, unknown>>) ?? [];
  const subjects = (profile.subjects as Array<Record<string, unknown>>) ?? [];
  const availabilities =
    (profile.availabilities as Array<{ weekday: number; startLocal: string; endLocal: string }>) ??
    [];

  return (
    <AdminLayout locale={locale}>
      <div
        className="flex flex-col gap-6 py-4 w-full px-4 sm:px-6 lg:px-8"
        data-testid="admin-tutor-detail-page"
      >
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={withLocale('/dashboard/admin/verification', locale)}
              className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isBn ? 'ভেরিফিকেশন কিউ' : 'Verification Queue'}</span>
            </Link>
            <span>•</span>
            <Link
              href={withLocale('/dashboard/admin/users/tutors', locale)}
              className="hover:text-foreground transition-colors font-medium"
            >
              <span>{isBn ? 'শিক্ষক ডিরেক্টরি' : 'Tutor Directory'}</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">
              {user?.displayName || (isBn ? 'শিক্ষক প্রোফাইল' : 'Tutor Dossier')}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>
        </div>

        {/* ============================================================ */}
        {/* TUTOR DOSSIER HERO CARD                                      */}
        {/* ============================================================ */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl uppercase">
                {user?.displayName?.slice(0, 2) || 'TU'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {user?.displayName || 'Unknown Tutor'}
                  </h1>
                  <StatusBadge status={String(profile.verificationStatus)} size="sm">
                    {levelStatusLabel(profile.verificationStatus, locale)}
                  </StatusBadge>
                  <Badge
                    variant={profile.publicationStatus === 'published' ? 'success' : 'secondary'}
                  >
                    {profile.publicationStatus === 'published'
                      ? isBn
                        ? 'মার্কেটপ্লেসে লাইভ'
                        : 'Live'
                      : isBn
                        ? '⚪ খসড়া'
                        : '⚪ Draft'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1.5">
                  {user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </span>
                  )}
                  {user?.phoneE164 && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {user.phoneE164}
                    </span>
                  )}
                  {user?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {isBn ? 'যোগদান: ' : 'Joined: '}
                      {formatDate(user.createdAt, locale)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Link
                href={withLocale(`/tutors/${tutorId}`, locale)}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors"
              >
                <span>{isBn ? 'পাবলিক প্রোফাইল প্রিভিউ' : 'View Public Profile'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* NAVIGATION TABS                                              */}
        {/* ============================================================ */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-2.5">
          {[
            { id: 'profile', bn: 'প্রোফাইল ও বায়ো', en: 'Profile & Bio', icon: UserCheck },
            {
              id: 'education',
              bn: 'শিক্ষাগত যোগ্যতা',
              en: 'Education',
              icon: GraduationCap,
              count: qualifications.length,
            },
            {
              id: 'subjects',
              bn: 'পাঠদান বিষয়সমূহ',
              en: 'Subjects',
              icon: BookOpen,
              count: subjects.length,
            },
            {
              id: 'schedule',
              bn: 'সাপ্তাহিক শিডিউল',
              en: 'Schedule',
              icon: Calendar,
              count: availabilities.length,
            },
            { id: 'documents', bn: 'ভেরিফিকেশন প্রমাণাদি', en: 'Evidence Docs', icon: FileSearch },
            {
              id: 'history',
              bn: 'পর্যালোচনার ইতিহাস',
              en: 'Review Trail',
              icon: Layers,
              count: reviewHistory.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as never)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{isBn ? tab.bn : tab.en}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* TWO-COLUMN LAYOUT: MAIN TAB CONTENT + DECISION CONSOLE       */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Inspection Column (Left 2 spans) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* TAB 1: PROFILE & BIO */}
            {activeTab === 'profile' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-5">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  {isBn ? 'ব্যক্তিগত ও পেশাদার পরিচিতি' : 'Personal & Professional Profile'}
                </h3>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        {isBn ? 'শিরোনাম (বাংলা)' : 'Headline (Bangla)'}
                      </Label>
                      <p className="text-xs font-bold text-foreground">
                        {String(profile.headlineBn || profile.headline || '—')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        {isBn ? 'শিরোনাম (ইংরেজি)' : 'Headline (English)'}
                      </Label>
                      <p className="text-xs font-bold text-foreground">
                        {String(profile.headlineEn || profile.headline || '—')}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      {isBn ? 'পরিচিতি / বায়ো (বাংলা)' : 'Biography (Bangla)'}
                    </Label>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {String(profile.bioBn || profile.bio || '—')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      {isBn ? 'পরিচিতি / বায়ো (ইংরেজি)' : 'Biography (English)'}
                    </Label>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {String(profile.bioEn || profile.bio || '—')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {isBn ? 'অভিজ্ঞতা' : 'Experience'}
                      </span>
                      <p className="text-sm font-extrabold text-foreground">
                        {profile.yearsExperience ? `${profile.yearsExperience} বছর` : '১ বছর'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {isBn ? 'ঘণ্টাপ্রতি ফি' : 'Hourly Rate'}
                      </span>
                      <p className="text-sm font-extrabold text-primary">
                        ৳
                        {profile.hourlyRateMinor
                          ? Math.round(Number(profile.hourlyRateMinor) / 100)
                          : 500}{' '}
                        / ঘণ্টা
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {isBn ? 'পাঠদানের মাধ্যম' : 'Teaching Modes'}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.isArray(profile.teachingModes) &&
                        profile.teachingModes.length > 0 ? (
                          profile.teachingModes.map((mode: string) => (
                            <span
                              key={mode}
                              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                            >
                              {mode === 'online'
                                ? 'অনলাইন'
                                : mode === 'student_home'
                                  ? 'ছাত্রের বাসা'
                                  : 'শিক্ষকের স্থান'}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">অনলাইন</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDUCATION & QUALIFICATIONS */}
            {activeTab === 'education' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {isBn ? 'শিক্ষাগত যোগ্যতা ও সনদ তালিকা' : 'Educational Qualifications'}
                </h3>

                {qualifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    {isBn
                      ? 'কোনো সনদ বা শিক্ষাগত যোগ্যতা যুক্ত করা হয়নি।'
                      : 'No qualifications added.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {qualifications.map((q, idx) => (
                      <div
                        key={String(q.id || idx)}
                        className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-foreground">
                              {String(q.title || 'Qualification')}
                            </h4>
                            <Badge variant="outline" className="text-[10px]">
                              {String(q.type || q.qualificationType || 'Degree')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {String(q.institution || '—')} • সন: {String(q.issuedYear || '—')}
                          </p>
                        </div>

                        <StatusBadge status={String(q.reviewStatus || 'pending')} size="sm">
                          {String(q.reviewStatus || 'pending')}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBJECTS & RATES */}
            {activeTab === 'subjects' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {isBn ? 'পাঠদানের বিষয়সমূহ ও ক্লাস লেভেল' : 'Teaching Subjects & Class Levels'}
                </h3>

                {subjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    {isBn ? 'কোনো পাঠদান বিষয় যুক্ত করা হয়নি।' : 'No subjects added.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map((sub, idx) => {
                      const subjectName =
                        subjectsMap.get(String(sub.subjectId)) ||
                        String(sub.subjectNameBn || sub.subjectNameEn || sub.subjectId);
                      const levelName =
                        levelsMap.get(String(sub.educationLevelId)) ||
                        String(
                          sub.educationLevelNameBn ||
                            sub.educationLevelNameEn ||
                            sub.educationLevelId,
                        );
                      const rate = sub.hourlyRateMinor
                        ? Math.round(Number(sub.hourlyRateMinor) / 100)
                        : sub.rateMinor
                          ? Math.round(Number(sub.rateMinor) / 100)
                          : 500;

                      return (
                        <div
                          key={String(sub.id || idx)}
                          className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{subjectName}</span>
                            <span className="text-xs font-extrabold text-primary">
                              ৳{rate}/ঘণ্টা
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{levelName}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SCHEDULE & AVAILABILITY */}
            {activeTab === 'schedule' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {isBn ? 'সাপ্তাহিক সময়সূচি ও প্রাপ্যতা' : 'Weekly Availability Schedule'}
                </h3>

                {availabilities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    {isBn ? 'কোনো সময়সূচি সেট করা হয়নি।' : 'No availability slots set.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {WEEKDAYS.map((day) => {
                      const daySlots = availabilities.filter((a) => a.weekday === day.id);
                      return (
                        <div
                          key={day.id}
                          className={`rounded-xl border p-3 text-xs flex flex-col gap-1.5 ${
                            daySlots.length > 0
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border/60 bg-muted/10 opacity-60'
                          }`}
                        >
                          <span className="font-bold text-foreground block">
                            {isBn ? day.bn : day.en}
                          </span>
                          {daySlots.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground">
                              {isBn ? 'বন্ধ' : 'Closed'}
                            </span>
                          ) : (
                            daySlots.map((s, idx) => (
                              <span
                                key={idx}
                                className="block text-[11px] font-mono text-primary font-semibold"
                              >
                                {s.startLocal} – {s.endLocal}
                              </span>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: EVIDENCE DOCUMENTS & SIGNED PREVIEW */}
            {activeTab === 'documents' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-5">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-primary" />
                  {isBn ? 'ভেরিফিকেশন প্রমাণাদি ও নথি পরিদর্শন' : 'Verification Evidence Documents'}
                </h3>

                <div className="flex flex-col gap-4">
                  {dossierLevels.map((lvl) => {
                    const docs = (lvl.documents as unknown as Array<Record<string, unknown>>) ?? [];
                    return (
                      <div
                        key={lvl.id}
                        className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-muted/10"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {levelLabel(lvl.level, locale)}
                            </span>
                            <StatusBadge status={lvl.status} size="sm">
                              {levelStatusLabel(lvl.status, locale)}
                            </StatusBadge>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Ver: {lvl.version}
                          </span>
                        </div>

                        {docs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 italic">
                            {isBn
                              ? 'এই স্তরে কোনো নথি জমা দেওয়া হয়নি।'
                              : 'No documents filed for this level.'}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {docs.map((doc) => {
                              const docId = String(doc.id);
                              const docType = String(doc.documentType);
                              const reviewStatus = String(doc.reviewStatus || 'pending');
                              const labelText = documentTypeLabel(docType as never, locale);

                              return (
                                <div
                                  key={docId}
                                  className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-semibold text-foreground">
                                        {labelText}
                                      </span>
                                      <Badge
                                        variant={
                                          reviewStatus === 'approved'
                                            ? 'success'
                                            : reviewStatus === 'rejected'
                                              ? 'destructive'
                                              : 'secondary'
                                        }
                                        className="text-[10px]"
                                      >
                                        {reviewStatus}
                                      </Badge>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground block ml-6">
                                      ID: {docId.slice(0, 8)}... • জমা:{' '}
                                      {doc.createdAt
                                        ? formatDate(String(doc.createdAt), locale)
                                        : '—'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePreview(docId, labelText)}
                                      disabled={loadingPreview}
                                      className="h-8 text-xs flex items-center gap-1"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>{isBn ? 'নথি দেখুন' : 'Preview'}</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleVerifyDoc(docId, 'approved')}
                                      disabled={verifyingDoc || reviewStatus === 'approved'}
                                      className="h-8 text-xs text-primary hover:bg-primary/10"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleVerifyDoc(docId, 'rejected')}
                                      disabled={verifyingDoc || reviewStatus === 'rejected'}
                                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      <span>{isBn ? 'বাতিল' : 'Reject'}</span>
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: REVIEW HISTORY & AUDIT */}
            {activeTab === 'history' && (
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {isBn ? 'পর্যালোচনার ইতিহাস ও অডিট ট্রেইল' : 'Review Decision Trail'}
                </h3>

                {reviewHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    {isBn ? 'এখনও কোনো পর্যালোচনা রেকর্ড নেই।' : 'No review history records yet.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reviewHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {item.level ? levelLabel(item.level, locale) : 'Level Decision'}
                            </span>
                            <StatusBadge status={item.decision} size="sm">
                              {item.decision}
                            </StatusBadge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(item.createdAt, locale)}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          {isBn ? 'কারণ কোড: ' : 'Reason: '}
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {item.reasonCode}
                          </code>
                        </p>

                        {item.applicantFeedback && (
                          <div className="p-2 rounded-lg bg-card border border-border text-[11px] text-foreground">
                            <span className="font-semibold block text-muted-foreground">
                              {isBn ? 'শিক্ষককে পাঠানো ফিডব্যাক:' : 'Feedback to Tutor:'}
                            </span>
                            {item.applicantFeedback}
                          </div>
                        )}

                        {item.internalNotes && (
                          <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                            <Lock className="w-3 h-3 inline text-muted-foreground" />
                            <span>{isBn ? 'অভ্যন্তরীণ নোট: ' : 'Internal note: '} {item.internalNotes}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* REVIEW DECISION CONSOLE (RIGHT 1 SPAN)                        */}
          {/* ============================================================ */}
          <div className="flex flex-col gap-4 sticky top-6">
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isBn ? 'ভেরিফিকেশন সিদ্ধান্ত গ্রহণ' : 'Verification Decision Console'}
                </h3>
              </div>

              <form
                onSubmit={handleSubmitDecision}
                className="flex flex-col gap-3.5 text-left text-xs"
              >
                {/* Level selector */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold">
                    {isBn ? 'যাচাই স্তর' : 'Level to Review'}
                  </Label>
                  <Select
                    value={selectedLevel}
                    onValueChange={(val) => setSelectedLevel(val as TutorVerificationLevel)}
                  >
                    <SelectTrigger className="w-full text-xs h-9">
                      <SelectValue
                        placeholder={isBn ? 'যাচাই স্তর নির্বাচন করুন' : 'Select level'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dossierLevels.map((lvl) => (
                        <SelectItem key={lvl.id} value={lvl.level}>
                          {levelLabel(lvl.level, locale)} ({lvl.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Decision selector */}
                {(() => {
                  const selectedLevelRow = dossierLevels.find((lvl) => lvl.level === selectedLevel);
                  const isApproved = selectedLevelRow?.status === 'approved';
                  const isSuspended = selectedLevelRow?.status === 'suspended';

                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold">
                          {isBn ? 'চূড়ান্ত সিদ্ধান্ত' : 'Decision'}
                        </Label>
                        {isApproved && (
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {isBn ? 'ইতিমধ্যে অনুমোদিত' : 'Already Approved'}
                          </span>
                        )}
                        {isSuspended && (
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {isBn ? 'স্থগিত রয়েছে' : 'Currently Suspended'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => setDecision('approved')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            decision === 'approved' && !isApproved
                              ? 'border-primary bg-primary text-primary-foreground'
                              : isApproved
                                ? 'opacity-40 cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                                : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {isBn
                            ? isSuspended
                              ? '✓ পুনঃঅনুমোদন'
                              : '✓ অনুমোদন'
                            : isSuspended
                              ? '✓ Reinstate'
                              : '✓ Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => setDecision('needs_information')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            decision === 'needs_information' && !isApproved
                              ? 'border-warning bg-warning text-warning-foreground'
                              : isApproved
                                ? 'opacity-40 cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                                : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {isBn ? '⚠️ সংশোধন চান' : '⚠️ Need Info'}
                        </button>
                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => setDecision('rejected')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            decision === 'rejected' && !isApproved
                              ? 'border-destructive bg-destructive text-destructive-foreground'
                              : isApproved
                                ? 'opacity-40 cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                                : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {isBn ? '✕ বাতিল' : '✕ Reject'}
                        </button>
                        <button
                          type="button"
                          disabled={isSuspended}
                          onClick={() => setDecision('suspended')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            decision === 'suspended'
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {isBn ? '⛔ স্থগিত' : '⛔ Suspend'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Reason code preset */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold">
                    {isBn ? 'কারণ কোড' : 'Reason Code'}
                  </Label>
                  <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger className="w-full text-xs h-9">
                      <SelectValue
                        placeholder={isBn ? 'কারণ কোড নির্বাচন করুন' : 'Select reason code'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_REASON_CODES.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {isBn ? r.bn : r.en} ({r.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Feedback for applicant */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      {isBn ? 'শিক্ষককে বার্তা (Feedback to Tutor)' : 'Feedback to Tutor'}
                    </Label>
                    {(decision === 'rejected' || decision === 'needs_information') && (
                      <span className="text-[10px] text-destructive font-semibold">
                        বাধ্যতামূলক *
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={3}
                    value={applicantFeedback}
                    onChange={(e) => setApplicantFeedback(e.target.value)}
                    placeholder={
                      isBn
                        ? 'শিক্ষক তার ড্যাশবোর্ডে এই বার্তাটি দেখতে পাবেন...'
                        : 'Visible on tutor dashboard alert banner...'
                    }
                    className="text-xs"
                  />
                </div>

                {/* Internal notes */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold">
                    {isBn ? 'অভ্যন্তরীণ নোট (গোপনীয়)' : 'Internal Reviewer Notes'}
                  </Label>
                  <Textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder={
                      isBn
                        ? 'শুধুমাত্র অ্যাডমিন ও কমপ্লায়েন্স টিমের জন্য...'
                        : 'Only visible to compliance staff...'
                    }
                    className="text-xs"
                  />
                </div>

                {decisionError && (
                  <Alert variant="destructive" className="py-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">{decisionError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={deciding}
                  isLoading={deciding}
                  className="w-full font-bold text-xs h-10"
                >
                  {isBn ? 'সিদ্ধান্ত কার্যকর করুন' : 'Record Final Decision'}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DOCUMENT PREVIEW MODAL                                       */}
        {/* ============================================================ */}
        {preview && (
          <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-base flex items-center justify-between">
                  <span>{preview.label}</span>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary font-normal flex items-center gap-1 hover:underline"
                  >
                    <span>{isBn ? 'নতুন ট্যাবে খুলুন' : 'Open in new tab'}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </DialogTitle>
              </DialogHeader>

              <div className="h-[65vh] w-full border border-border rounded-xl overflow-hidden bg-muted/20 flex flex-col items-center justify-center p-2 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.label}
                  className="max-h-full max-w-full object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const iframe = e.currentTarget.parentElement?.querySelector('iframe');
                    if (iframe) iframe.style.display = 'block';
                  }}
                />
                <iframe
                  src={preview.url}
                  title={preview.label}
                  style={{ display: 'none' }}
                  className="w-full h-full border-none rounded"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
