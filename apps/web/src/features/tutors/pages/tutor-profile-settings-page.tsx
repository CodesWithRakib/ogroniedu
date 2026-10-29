'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  Save,
  BookOpen,
  Plus,
  Trash2,
  ShieldCheck,
  Send,
  Calendar,
  Clock,
  GraduationCap,
  Sparkles,
  Eye,
  ExternalLink,
  Layers,
  FileCheck,
  User,
  Star,
  MapPin,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  LoadingSpinner,
  Textarea,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  StatusBadge,
} from '@/components/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { playAudioTone } from '@/lib/audio/notification-sound';
import {
  useGetOwnTutorProfileQuery,
  useUpdateOwnTutorProfileMutation,
  useAddTutorSubjectMutation,
  useDeleteTutorSubjectMutation,
  useSetTutorPublicationMutation,
  useSetTutorAvailabilityMutation,
  useGetOwnVerificationDossierQuery,
  useDeleteTutorQualificationMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';
import { useGetSubjectsQuery, useGetEducationLevelsQuery } from '@/store/services/taxonomy-api';
import { VerificationLevelCard } from '../components/verificationLevelCard';
import { QualificationUploadCard } from '../components/qualificationUploadCard';

type TeachingMode = 'in_person' | 'online' | 'hybrid';

const TEACHING_MODES: Array<{ value: TeachingMode; en: string; bn: string }> = [
  { value: 'online', en: 'Online', bn: 'অনলাইন' },
  { value: 'in_person', en: 'In person', bn: 'সশরীরে' },
  { value: 'hybrid', en: 'Hybrid', bn: 'হাইব্রিড' },
];

const WEEKDAYS = [
  { day: 0, bn: 'রবিবার', en: 'Sun' },
  { day: 1, bn: 'সোমবার', en: 'Mon' },
  { day: 2, bn: 'মঙ্গলবার', en: 'Tue' },
  { day: 3, bn: 'বুধবার', en: 'Wed' },
  { day: 4, bn: 'বৃহস্পতিবার', en: 'Thu' },
  { day: 5, bn: 'শুক্রবার', en: 'Fri' },
  { day: 6, bn: 'শনিবার', en: 'Sat' },
];

interface FormState {
  headlineEn: string;
  headlineBn: string;
  bioEn: string;
  bioBn: string;
  yearsExperience: string;
  hourlyRate: string;
  teachingModes: TeachingMode[];
}

interface TutorConfiguredSubject {
  id: string;
  hourlyRateMinor?: string | number | null;
  subject?: { id: string; nameEn?: string; nameBn?: string };
  educationLevel?: { id: string; nameEn?: string; nameBn?: string };
}

interface TutorConfiguredAvailability {
  id: string;
  weekday: number;
  startLocal: string;
  endLocal: string;
}

interface TutorConfiguredQualification {
  id: string;
  title?: string;
  institution?: string;
  issuedYear?: number | string;
  qualificationType?: string;
  reviewStatus?: string;
  verificationStatus?: string;
}

const EMPTY_FORM: FormState = {
  headlineEn: '',
  headlineBn: '',
  bioEn: '',
  bioBn: '',
  yearsExperience: '',
  hourlyRate: '',
  teachingModes: [],
};

function resolveProfile(envelope: unknown): TutorOwnProfile | undefined {
  if (!envelope || typeof envelope !== 'object') return undefined;
  return 'profile' in envelope
    ? (envelope as { profile: TutorOwnProfile }).profile
    : (envelope as TutorOwnProfile);
}

function toForm(profile: TutorOwnProfile | undefined): FormState {
  if (!profile) return EMPTY_FORM;
  const modes = Array.isArray(profile.teachingModes)
    ? profile.teachingModes.filter((mode): mode is TeachingMode =>
        TEACHING_MODES.some((option) => option.value === mode),
      )
    : [];
  return {
    headlineEn: profile.headlineEn ?? profile.headline ?? '',
    headlineBn: profile.headlineBn ?? '',
    bioEn: profile.bioEn ?? profile.bio ?? '',
    bioBn: profile.bioBn ?? '',
    yearsExperience:
      profile.yearsExperience === null || profile.yearsExperience === undefined
        ? ''
        : String(profile.yearsExperience),
    hourlyRate: profile.hourlyRateMinor ? String(Number(profile.hourlyRateMinor) / 100) : '',
    teachingModes: modes,
  };
}

export type TutorProfileTab =
  'bio' | 'qualifications' | 'subjects' | 'schedule' | 'verification' | 'preview';

/**
 * Unified Tutor Profile & Credentials Command Center:
 * Seamlessly integrates Bio, Qualifications, Subjects & Pricing, Availability Schedule,
 * 3-Tier Verification Dossier, and Live Student Marketplace Preview into a single, cohesive hub.
 */
export function TutorProfileSettingsPage({
  locale,
  defaultTab = 'bio',
}: {
  locale: Locale;
  defaultTab?: TutorProfileTab;
}) {
  const isBn = locale === 'bn';
  const profileQuery = useGetOwnTutorProfileQuery();
  const dossierQuery = useGetOwnVerificationDossierQuery();
  const [updateProfile, updateState] = useUpdateOwnTutorProfileMutation();
  const [addSubject, { isLoading: addingSubject }] = useAddTutorSubjectMutation();
  const [deleteSubject, { isLoading: deletingSubject }] = useDeleteTutorSubjectMutation();
  const [deleteQualification, { isLoading: deletingQual }] = useDeleteTutorQualificationMutation();
  const [setAvailability, { isLoading: savingAvailability }] = useSetTutorAvailabilityMutation();
  const [setPublication, { isLoading: publishing }] = useSetTutorPublicationMutation();

  const subjectsQuery = useGetSubjectsQuery();
  const levelsQuery = useGetEducationLevelsQuery();

  const profile = resolveProfile(profileQuery.data?.data);

  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Subject management state
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = React.useState<string>('');
  const [subjectRate, setSubjectRate] = React.useState<string>('');
  const [subjectMessage, setSubjectMessage] = React.useState<string | null>(null);
  const [subjectError, setSubjectError] = React.useState<string | null>(null);

  // Qualification upload modal state
  const [showAddQual, setShowAddQual] = React.useState(false);
  const [qualActionMsg, setQualActionMsg] = React.useState<string | null>(null);

  // Availability schedule state
  const [selectedDays, setSelectedDays] = React.useState<number[]>([0, 1, 2, 3, 4]); // Sun-Thu default
  const [startTime, setStartTime] = React.useState<string>('16:00');
  const [endTime, setEndTime] = React.useState<string>('20:00');
  const [availabilityMessage, setAvailabilityMessage] = React.useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);

  // Publication toggle message
  const [pubMessage, setPubMessage] = React.useState<string | null>(null);
  const [pubError, setPubError] = React.useState<string | null>(null);

  // Sync tab from URL query param if present
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (
        urlTab &&
        ['bio', 'qualifications', 'subjects', 'schedule', 'verification', 'preview'].includes(
          urlTab,
        )
      ) {
        setActiveTab(urlTab);
      }
    }
  }, []);

  React.useEffect(() => {
    if (profile && !initialized) {
      setForm(toForm(profile));
      setInitialized(true);
    }
  }, [profile, initialized]);

  // Set default subject and level options when loaded
  React.useEffect(() => {
    const subs = subjectsQuery.data?.data;
    if (subs && subs.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subs[0].id);
    }
  }, [subjectsQuery.data, selectedSubjectId]);

  React.useEffect(() => {
    const lvls = levelsQuery.data?.data;
    if (lvls && lvls.length > 0 && !selectedLevelId) {
      setSelectedLevelId(lvls[0].id);
    }
  }, [levelsQuery.data, selectedLevelId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleMode = (mode: TeachingMode) => {
    setSaved(false);
    setForm((current) => ({
      ...current,
      teachingModes: current.teachingModes.includes(mode)
        ? current.teachingModes.filter((item) => item !== mode)
        : [...current.teachingModes, mode],
    }));
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmitBio = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (!form.headlineEn.trim()) {
      setError(
        isBn
          ? 'ইংরেজি শিরোনাম পূরণ করা বাধ্যতামূলক।'
          : 'English headline is required for directory listings.',
      );
      return;
    }
    if (!form.bioEn.trim()) {
      setError(
        isBn
          ? 'ইংরেজি পরিচিতি বিবরণ পূরণ করা বাধ্যতামূলক।'
          : 'English bio is required for student transparency.',
      );
      return;
    }

    const years = form.yearsExperience.trim() === '' ? null : Number(form.yearsExperience);
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) {
      setError(
        isBn
          ? 'অভিজ্ঞতার বছর অবশ্যই ০ থেকে ৬০-এর মধ্যে একটি পূর্ণসংখ্যা হতে হবে।'
          : 'Years of experience must be an integer between 0 and 60.',
      );
      return;
    }

    const rate = form.hourlyRate.trim() === '' ? null : Number(form.hourlyRate);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50000)) {
      setError(
        isBn
          ? 'ঘণ্টাপ্রতি ফি অবশ্যই ০ থেকে ৫০,০০০ টাকার মধ্যে হতে হবে।'
          : 'Hourly rate must be between 0 and 50,000 BDT.',
      );
      return;
    }

    try {
      await updateProfile({
        headlineEn: form.headlineEn.trim(),
        headlineBn: form.headlineBn.trim() || undefined,
        bioEn: form.bioEn.trim(),
        bioBn: form.bioBn.trim() || undefined,
        yearsExperience: years,
        hourlyRateMinor: rate !== null ? Math.round(rate * 100) : null,
        teachingModes: form.teachingModes,
      }).unwrap();
      playAudioTone('success');
      setSaved(true);
      profileQuery.refetch();
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectMessage(null);
    setSubjectError(null);

    if (!selectedSubjectId || !selectedLevelId) {
      setSubjectError(
        isBn ? 'বিষয় এবং শ্রেণি উভয়ই নির্বাচন করুন।' : 'Select both subject and level.',
      );
      return;
    }

    const customRate = subjectRate.trim() ? Math.round(Number(subjectRate) * 100) : undefined;

    try {
      await addSubject({
        subjectId: selectedSubjectId,
        educationLevelId: selectedLevelId,
        hourlyRateMinor: customRate,
      }).unwrap();
      playAudioTone('chime');
      setSubjectMessage(isBn ? 'পাঠদান বিষয় সফলভাবে যুক্ত হয়েছে।' : 'Subject added successfully.');
      setSubjectRate('');
      profileQuery.refetch();
    } catch (err) {
      setSubjectError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleDeleteSubject = async (subjectRecordId: string) => {
    setSubjectMessage(null);
    setSubjectError(null);
    try {
      await deleteSubject(subjectRecordId).unwrap();
      playAudioTone('chime');
      setSubjectMessage(isBn ? 'বিষয়টি সরানো হয়েছে।' : 'Subject removed.');
      profileQuery.refetch();
    } catch (err) {
      setSubjectError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleDeleteQualification = async (qualId: string) => {
    setQualActionMsg(null);
    try {
      await deleteQualification(qualId).unwrap();
      playAudioTone('chime');
      setQualActionMsg(isBn ? 'সনদটি সফলভাবে মুছে ফেলা হয়েছে।' : 'Qualification removed.');
      profileQuery.refetch();
    } catch (err) {
      setQualActionMsg(normalizeUnknownError(err, locale).message);
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityMessage(null);
    setAvailabilityError(null);

    if (selectedDays.length === 0) {
      setAvailabilityError(
        isBn ? 'কমপক্ষে একটি পাঠদানের দিন নির্বাচন করুন।' : 'Select at least one available day.',
      );
      return;
    }

    const slots = selectedDays.map((weekday) => ({
      weekday,
      startLocal: startTime.slice(0, 5),
      endLocal: endTime.slice(0, 5),
    }));

    try {
      await setAvailability({ slots }).unwrap();
      playAudioTone('success');
      setAvailabilityMessage(
        isBn
          ? `সাপ্তাহিক শিডিউল সংরক্ষিত হয়েছে (${selectedDays.length} দিন, ${startTime} - ${endTime})।`
          : `Schedule saved (${selectedDays.length} days, ${startTime} - ${endTime}).`,
      );
      profileQuery.refetch();
    } catch (err) {
      setAvailabilityError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleTogglePublication = async () => {
    setPubMessage(null);
    setPubError(null);
    const currentStatus = profile?.publicationStatus ?? 'draft';
    const targetStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await setPublication({ publicationStatus: targetStatus }).unwrap();
      playAudioTone(targetStatus === 'published' ? 'success' : 'chime');
      setPubMessage(
        targetStatus === 'published'
          ? isBn
            ? 'অভিনন্দন! আপনার প্রোফাইল এখন শিক্ষার্থীদের জন্য উন্মুক্ত ও প্রকাশিত।'
            : 'Congratulations! Your profile is now live to all students.'
          : isBn
            ? 'আপনার প্রোফাইল খসড়া (Draft) মোডে নেওয়া হয়েছে।'
            : 'Your profile has been set to draft mode.',
      );
      profileQuery.refetch();
    } catch (err) {
      setPubError(normalizeUnknownError(err, locale).message);
    }
  };

  const taxonomySubjects = subjectsQuery.data?.data ?? [];
  const taxonomyLevels = levelsQuery.data?.data ?? [];
  const configuredSubjects = (profile?.subjects as TutorConfiguredSubject[] | undefined) ?? [];
  const configuredAvailabilities =
    (profile?.availabilities as TutorConfiguredAvailability[] | undefined) ?? [];
  const configuredQualifications =
    (profile?.qualifications as TutorConfiguredQualification[] | undefined) ?? [];

  const dossierLevels = dossierQuery.data?.data?.levels ?? [];
  const overallExpiry = dossierQuery.data?.data?.profile?.verificationExpiresAt ?? null;

  const verificationStatus = String(profile?.verificationStatus ?? 'not_submitted');
  const publicationStatus = String(profile?.publicationStatus ?? 'draft');
  const isApproved = verificationStatus === 'approved';
  const isUnderReview = verificationStatus === 'submitted' || verificationStatus === 'under_review';
  const tutorId = profile?.userId || profile?.id || '';

  return (
    <TutorLayout locale={locale} title={isBn ? 'প্রোফাইল ও ভেরিফিকেশন' : 'Profile & Credentials'}>
      <div
        className="flex flex-col gap-6 py-4 w-full px-4 sm:px-6 lg:px-8"
        data-testid="tutor-profile-command-center"
      >
        {/* ============================================================ */}
        {/* HERO COMMAND CENTER BANNER                                   */}
        {/* ============================================================ */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl uppercase">
                {profile?.headlineEn?.slice(0, 2) || 'TU'}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {isBn
                      ? form.headlineBn || form.headlineEn || 'শিক্ষক প্রোফাইল ও সনদ কেন্দ্র'
                      : form.headlineEn || 'Tutor Profile & Credentials Center'}
                  </h1>
                  <StatusBadge status={verificationStatus} size="sm">
                    {verificationStatus === 'approved'
                      ? isBn
                        ? 'ভেরিফাইড'
                        : 'Verified'
                      : verificationStatus === 'under_review' || verificationStatus === 'submitted'
                        ? isBn
                          ? 'পর্যালোচনায়'
                          : 'In Review'
                        : verificationStatus === 'changes_requested'
                          ? isBn
                            ? 'সংশোধন প্রয়োজন'
                            : 'Changes Requested'
                          : isBn
                            ? 'খসড়া'
                            : 'Draft'}
                  </StatusBadge>
                  <Badge
                    variant={publicationStatus === 'published' ? 'success' : 'secondary'}
                    className="text-[11px]"
                  >
                    {publicationStatus === 'published'
                      ? isBn
                        ? '🟢 মার্কেটপ্লেসে লাইভ'
                        : '🟢 Live'
                      : isBn
                        ? '⚪ খসড়া মোড'
                        : '⚪ Draft Mode'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>
                    {isBn
                      ? 'আপনার পরিচিতি, সনদ, বিষয়, শিডিউল এবং পাবলিক প্রিভিউ এক জায়গায় পরিচালনা করুন।'
                      : 'Manage your bio, credentials, subjects, schedule and live public preview in one unified center.'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {tutorId && (
                <Link
                  href={withLocale(`/tutors/${tutorId}`, locale)}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>{isBn ? 'পাবলিক পেজ ↗' : 'Public Page ↗'}</span>
                </Link>
              )}

              <Button
                size="sm"
                variant={publicationStatus === 'published' ? 'outline' : 'primary'}
                onClick={handleTogglePublication}
                disabled={publishing}
                className="text-xs h-9 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {publishing
                  ? isBn
                    ? 'আপডেট হচ্ছে…'
                    : 'Updating…'
                  : publicationStatus === 'published'
                    ? isBn
                      ? 'খসড়া মোডে নিন'
                      : 'Switch to Draft'
                    : isBn
                      ? 'মার্কেটপ্লেসে প্রকাশ করুন'
                      : 'Publish to Marketplace'}
              </Button>
            </div>
          </div>

          {pubMessage && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-xs">{pubMessage}</AlertDescription>
            </Alert>
          )}
          {pubError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{pubError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* ============================================================ */}
        {/* TABS CONTAINER                                               */}
        {/* ============================================================ */}
        <Tabs
          defaultValue="bio"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col gap-4"
        >
          <TabList className="w-full flex flex-wrap justify-start gap-1 p-1.5 bg-muted/40 rounded-xl border border-border">
            <TabTrigger value="bio" className="flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              <span>{isBn ? 'পরিচিতি ও মূল তথ্য' : 'Bio & Overview'}</span>
            </TabTrigger>

            <TabTrigger value="qualifications" className="flex items-center gap-1.5 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>
                {isBn ? 'শিক্ষাগত সনদ' : 'Qualifications'}
                {configuredQualifications.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-background/80 text-[10px]">
                    {configuredQualifications.length}
                  </span>
                )}
              </span>
            </TabTrigger>

            <TabTrigger value="subjects" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                {isBn ? 'পাঠদান বিষয় ও ফি' : 'Subjects & Rates'}
                {configuredSubjects.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-background/80 text-[10px]">
                    {configuredSubjects.length}
                  </span>
                )}
              </span>
            </TabTrigger>

            <TabTrigger value="schedule" className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>{isBn ? 'সাপ্তাহিক সময়সূচি' : 'Schedule'}</span>
            </TabTrigger>

            <TabTrigger value="verification" className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isBn ? 'সনদ ও ভেরিফিকেশন' : 'Verification Dossier'}</span>
            </TabTrigger>

            <TabTrigger value="preview" className="flex items-center gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" />
              <span>{isBn ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
            </TabTrigger>
          </TabList>

          {/* ============================================================ */}
          {/* TAB 1: BIO & PROFILE INFO                                    */}
          {/* ============================================================ */}
          <TabContent value="bio">
            <Card className="rounded-xl border border-border">
              <CardHeader className="border-b border-border/80 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>
                    {isBn ? 'ব্যক্তিগত তথ্য ও টিচিং বায়ো' : 'Personal Profile & Teaching Bio'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'শিক্ষার্থী ও অভিভাবকদের আকৃষ্ট করতে আপনার সংক্ষিপ্ত শিরোনাম, পরিচিতি ও ঘণ্টাপ্রতি ফি আপডেট করুন।'
                    : 'Provide a compelling headline, detailed bio, hourly rate, and experience.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                {saved && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-xs">
                      {isBn
                        ? 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে।'
                        : 'Profile updated successfully.'}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmitBio} className="flex flex-col gap-5">
                  {/* Headlines */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="headlineBn" className="text-xs font-semibold">
                        {isBn ? 'বাংলা শিরোনাম' : 'Bengali Headline'}
                      </Label>
                      <Input
                        id="headlineBn"
                        value={form.headlineBn}
                        onChange={(e) => setField('headlineBn', e.target.value)}
                        placeholder="যেমন: অভিজ্ঞ গণিত ও পদার্থবিজ্ঞান শিক্ষক"
                        className="text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="headlineEn" className="text-xs font-semibold">
                        {isBn ? 'ইংরেজি শিরোনাম *' : 'English Headline *'}
                      </Label>
                      <Input
                        id="headlineEn"
                        value={form.headlineEn}
                        onChange={(e) => setField('headlineEn', e.target.value)}
                        placeholder="e.g. Experienced Math & Physics Tutor"
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Hourly rate & Experience */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="hourlyRate" className="text-xs font-semibold">
                        {isBn ? 'বেস ঘণ্টাপ্রতি ফি (টাকা)' : 'Base Hourly Rate (BDT)'}
                      </Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        min={0}
                        max={50000}
                        value={form.hourlyRate}
                        onChange={(e) => setField('hourlyRate', e.target.value)}
                        placeholder="e.g. 500"
                        className="text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="yearsExperience" className="text-xs font-semibold">
                        {isBn ? 'অভিজ্ঞতার বছর' : 'Years of Experience'}
                      </Label>
                      <Input
                        id="yearsExperience"
                        type="number"
                        min={0}
                        max={60}
                        value={form.yearsExperience}
                        onChange={(e) => setField('yearsExperience', e.target.value)}
                        placeholder="e.g. 4"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Teaching modes */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold">
                      {isBn ? 'পাঠদানের মাধ্যমসমূহ' : 'Teaching Modes'}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {TEACHING_MODES.map((option) => {
                        const active = form.teachingModes.includes(option.value);
                        return (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={active ? 'primary' : 'outline'}
                            aria-pressed={active}
                            onClick={() => toggleMode(option.value)}
                            className="text-xs"
                          >
                            {isBn ? option.bn : option.en}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bios */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="bioBn" className="text-xs font-semibold">
                        {isBn ? 'বাংলায় বিস্তারিত পরিচিতি' : 'Bengali Bio'}
                      </Label>
                      <Textarea
                        id="bioBn"
                        rows={5}
                        value={form.bioBn}
                        onChange={(e) => setField('bioBn', e.target.value)}
                        placeholder="আপনার পাঠদান পদ্ধতি, শিক্ষাগত পটভূমি ও অর্জন সংক্ষেপে লিখুন..."
                        className="text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="bioEn" className="text-xs font-semibold">
                        {isBn ? 'ইংরেজিতে বিস্তারিত পরিচিতি *' : 'English Bio *'}
                      </Label>
                      <Textarea
                        id="bioEn"
                        rows={5}
                        value={form.bioEn}
                        onChange={(e) => setField('bioEn', e.target.value)}
                        placeholder="Summarize your teaching philosophy, educational achievements, and student successes..."
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={updateState.isLoading}
                      className="gap-2 text-xs"
                    >
                      <Save className="h-4 w-4" />
                      {updateState.isLoading
                        ? isBn
                          ? 'সংরক্ষণ হচ্ছে…'
                          : 'Saving…'
                        : isBn
                          ? 'প্রোফাইল সংরক্ষণ করুন'
                          : 'Save Bio & Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabContent>

          {/* ============================================================ */}
          {/* TAB 2: QUALIFICATIONS & DEGREES                              */}
          {/* ============================================================ */}
          <TabContent value="qualifications">
            <Card className="rounded-xl border border-border">
              <CardHeader className="border-b border-border/80 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span>
                        {isBn
                          ? 'শিক্ষাগত যোগ্যতা ও সনদপত্র'
                          : 'Educational Qualifications & Degrees'}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isBn
                        ? 'আপনার এসএসসি, এইচএসসি, স্নাতক বা অন্যান্য ডিগ্রির বিবরণ ও প্রমাণপত্র যোগ করুন।'
                        : 'Upload certificates and specify institutions, degrees, and passing years.'}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant={showAddQual ? 'outline' : 'primary'}
                    onClick={() => setShowAddQual(!showAddQual)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {showAddQual
                        ? isBn
                          ? 'ফর্ম বন্ধ করুন'
                          : 'Close Form'
                        : isBn
                          ? 'নতুন ডিগ্রি যোগ করুন'
                          : 'Add Degree'}
                    </span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                {qualActionMsg && (
                  <Alert>
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs">{qualActionMsg}</AlertDescription>
                  </Alert>
                )}

                {/* Upload Degree Card Accordion */}
                {showAddQual && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {isBn
                          ? 'নতুন সনদ আপলোড ও নিবন্ধন করুন'
                          : 'Upload & Register New Credential'}
                      </span>
                    </h4>
                    <QualificationUploadCard
                      locale={locale}
                      onUploaded={() => {
                        setShowAddQual(false);
                        profileQuery.refetch();
                        setQualActionMsg(
                          isBn
                            ? 'সনদ সফলভাবে আপলোড হয়েছে এবং পর্যালোচনার জন্য তালিকাভুক্ত হয়েছে।'
                            : 'Credential uploaded and queued for verification.',
                        );
                      }}
                    />
                  </div>
                )}

                {/* Existing Qualifications List */}
                <div className="flex flex-col gap-3">
                  {configuredQualifications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center flex flex-col gap-2">
                      <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">
                        {isBn
                          ? 'এখনও কোনো সনদ বা ডিগ্রি যুক্ত করা হয়নি।'
                          : 'No qualifications added yet.'}
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        {isBn
                          ? 'উপরে "নতুন ডিগ্রি যোগ করুন" বাটনে ক্লিক করে আপনার সনদপত্র আপলোড করুন।'
                          : 'Click "Add Degree" above to upload your certificates and boost student trust.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {configuredQualifications.map((qual, idx) => (
                        <div
                          key={String(qual.id || idx)}
                          className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-3 shadow-xs"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-foreground">
                                {String(qual.title || 'Degree')}
                              </h4>
                              <StatusBadge
                                status={String(
                                  qual.reviewStatus || qual.verificationStatus || 'pending',
                                )}
                                size="sm"
                              >
                                {String(qual.reviewStatus || qual.verificationStatus || 'pending')}
                              </StatusBadge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {String(qual.institution || '—')} • সন:{' '}
                              {String(qual.issuedYear || '—')}
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              {String(qual.qualificationType || 'Degree')}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-end border-t border-border/60 pt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQualification(String(qual.id))}
                              disabled={deletingQual}
                              className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{isBn ? 'মুছুন' : 'Delete'}</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabContent>

          {/* ============================================================ */}
          {/* TAB 3: SUBJECTS & RATES                                      */}
          {/* ============================================================ */}
          <TabContent value="subjects">
            <Card className="rounded-xl border border-border">
              <CardHeader className="border-b border-border/80 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>
                    {isBn ? 'পাঠদান বিষয় ও স্তরভিত্তিক ফি' : 'Teaching Subjects & Level Rates'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'আপনি যে বিষয়গুলো পড়াতে চান এবং সংশ্লিষ্ট শ্রেণি ও ফি নির্ধারণ করুন।'
                    : 'Manage subjects and level-specific hourly rates.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                {subjectMessage && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-xs">{subjectMessage}</AlertDescription>
                  </Alert>
                )}
                {subjectError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{subjectError}</AlertDescription>
                  </Alert>
                )}

                {/* Current Subjects List */}
                <div className="flex flex-col gap-3">
                  <Label className="text-xs font-semibold block">
                    {isBn ? 'বর্তমান পাঠদান বিষয়সমূহ:' : 'Current Teaching Subjects:'}
                  </Label>
                  {configuredSubjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {isBn
                        ? 'এখনও কোনো বিষয় যুক্ত করা হয়নি। নিচে থেকে আপনার বিষয় নির্বাচন করুন।'
                        : 'No teaching subjects configured yet.'}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {configuredSubjects.map((sub) => {
                        const subjectName = isBn
                          ? sub.subject?.nameBn || sub.subject?.nameEn || 'বিষয়'
                          : sub.subject?.nameEn || 'Subject';
                        const levelName = isBn
                          ? sub.educationLevel?.nameBn || sub.educationLevel?.nameEn || 'শ্রেণি'
                          : sub.educationLevel?.nameEn || 'Level';
                        const rate = sub.hourlyRateMinor
                          ? `${Math.round(Number(sub.hourlyRateMinor) / 100)} ৳/ঘণ্টা`
                          : isBn
                            ? 'বেস রেট'
                            : 'Base Rate';

                        return (
                          <div
                            key={sub.id}
                            className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">
                                {subjectName}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px]">
                                  {levelName}
                                </Badge>
                                <span className="text-[11px] font-semibold text-primary">
                                  {rate}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={deletingSubject}
                              onClick={() => handleDeleteSubject(sub.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Subject Form with Shadcn UI Select */}
                <form
                  onSubmit={handleAddSubject}
                  className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-4"
                >
                  <Label className="text-xs font-bold block">
                    {isBn ? 'নতুন বিষয় ও শ্রেণি যোগ করুন' : 'Add New Subject & Level'}
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Subject Selector */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-medium">
                        {isBn ? 'বিষয় নির্বাচন করুন *' : 'Select Subject *'}
                      </Label>
                      <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                        <SelectTrigger className="w-full text-xs h-9">
                          <SelectValue
                            placeholder={isBn ? 'বিষয় নির্বাচন করুন' : 'Select subject'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {taxonomySubjects.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {isBn ? sub.nameBn || sub.nameEn : sub.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Education Level Selector */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-medium">
                        {isBn ? 'শ্রেণি / লেভেল *' : 'Class / Level *'}
                      </Label>
                      <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                        <SelectTrigger className="w-full text-xs h-9">
                          <SelectValue
                            placeholder={isBn ? 'শ্রেণি নির্বাচন করুন' : 'Select level'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {taxonomyLevels.map((lvl) => (
                            <SelectItem key={lvl.id} value={lvl.id}>
                              {isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hourly rate for this subject */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-medium">
                        {isBn ? 'এই বিষয়ের ফি (টাকা, ঐচ্ছিক)' : 'Subject Rate (BDT, Optional)'}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={subjectRate}
                        onChange={(e) => setSubjectRate(e.target.value)}
                        placeholder="e.g. 500"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addingSubject}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addingSubject
                        ? isBn
                          ? 'যুক্ত হচ্ছে…'
                          : 'Adding…'
                        : isBn
                          ? 'বিষয় যুক্ত করুন'
                          : 'Add Subject'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabContent>

          {/* ============================================================ */}
          {/* TAB 4: SCHEDULE & AVAILABILITY                               */}
          {/* ============================================================ */}
          <TabContent value="schedule">
            <Card className="rounded-xl border border-border">
              <CardHeader className="border-b border-border/80 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{isBn ? 'সাপ্তাহিক পাঠদান সময়সূচি' : 'Weekly Availability Schedule'}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'শিক্ষার্থীরা যেন সরাসরি খালি স্লটগুলোতে বুকিং অনুরোধ পাঠাতে পারে।'
                    : 'Set your regular weekly available hours and slots.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                {availabilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{availabilityError}</AlertDescription>
                  </Alert>
                )}
                {availabilityMessage && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-xs">{availabilityMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Active slots summary */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold">
                    {isBn ? 'বর্তমান সক্রিয় শিডিউল:' : 'Current Active Slots:'}
                  </Label>
                  {configuredAvailabilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {isBn
                        ? 'এখনও কোনো সাপ্তাহিক শিডিউল নির্ধারিত হয়নি। নিচে থেকে আপনার সময়সূচি সেট করুন।'
                        : 'No weekly schedule configured yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {configuredAvailabilities.map((slot) => {
                        const dayName = WEEKDAYS.find((w) => w.day === slot.weekday);
                        return (
                          <Badge
                            key={slot.id}
                            variant="secondary"
                            className="px-2.5 py-1 text-xs gap-1.5"
                          >
                            <Clock className="h-3 w-3 text-primary" />
                            <span>{isBn ? dayName?.bn : dayName?.en}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {slot.startLocal?.slice(0, 5)} - {slot.endLocal?.slice(0, 5)}
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Set Schedule Form */}
                <form
                  onSubmit={handleSaveAvailability}
                  className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold">
                      {isBn ? 'পাঠদানের দিনসমূহ নির্বাচন করুন:' : 'Select Teaching Days:'}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((w) => {
                        const active = selectedDays.includes(w.day);
                        return (
                          <Button
                            key={w.day}
                            type="button"
                            size="sm"
                            variant={active ? 'primary' : 'outline'}
                            aria-pressed={active}
                            onClick={() => toggleDay(w.day)}
                            className="text-xs"
                          >
                            {isBn ? w.bn : w.en}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-medium">
                        {isBn ? 'শুরুর সময় (Start Time)' : 'Start Time'}
                      </Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-medium">
                        {isBn ? 'শেষের সময় (End Time)' : 'End Time'}
                      </Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isBn ? 'কুইক প্রিসেট:' : 'Quick Presets:'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={() => {
                        setStartTime('16:00');
                        setEndTime('20:00');
                      }}
                    >
                      {isBn ? 'সন্ধ্যা (৪:০০ PM - ৮:০০ PM)' : 'Evening (4PM - 8PM)'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={() => {
                        setStartTime('08:00');
                        setEndTime('12:00');
                      }}
                    >
                      {isBn ? 'সকাল (৮:০০ AM - ১২:০০ PM)' : 'Morning (8AM - 12PM)'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={() => {
                        setStartTime('09:00');
                        setEndTime('21:00');
                      }}
                    >
                      {isBn ? 'সারাদিন (৯:০০ AM - ৯:০০ PM)' : 'Full Day (9AM - 9PM)'}
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingAvailability}
                      className="gap-1.5 text-xs"
                    >
                      <Save className="h-4 w-4" />
                      {savingAvailability
                        ? isBn
                          ? 'সংরক্ষণ হচ্ছে…'
                          : 'Saving…'
                        : isBn
                          ? 'সময়সূচি সংরক্ষণ করুন'
                          : 'Save Schedule'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabContent>

          {/* ============================================================ */}
          {/* TAB 5: 3-TIER VERIFICATION DOSSIER                           */}
          {/* ============================================================ */}
          <TabContent value="verification">
            <div className="flex flex-col gap-6">
              {/* Dossier status hero */}
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {isBn
                          ? '৩-স্তর ভেরিফিকেশন ও ট্রাস্ট ডসিয়ার'
                          : '3-Tier Verification & Trust Dossier'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isBn
                          ? 'পরিচয়, শিক্ষাগত যোগ্যতা ও প্রাতিষ্ঠানিক সনদ অনুমোদিত হলে প্রোফাইল ভেরিফাইড ব্যাজ পায়।'
                          : 'Complete Identity, Educational, and Institutional levels for full verification.'}
                      </p>
                    </div>
                  </div>

                  {overallExpiry && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {isBn
                        ? `বৈধতার মেয়াদ: ${new Date(overallExpiry).toLocaleDateString(locale)}`
                        : `Expires: ${new Date(overallExpiry).toLocaleDateString(locale)}`}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 3 Level Cards Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                {dossierLevels.map((level) => (
                  <VerificationLevelCard
                    key={level.id}
                    record={level}
                    locale={locale}
                    onChanged={() => {
                      dossierQuery.refetch();
                      profileQuery.refetch();
                    }}
                  />
                ))}
              </div>
            </div>
          </TabContent>

          {/* ============================================================ */}
          {/* TAB 6: LIVE MARKETPLACE PREVIEW                              */}
          {/* ============================================================ */}
          <TabContent value="preview">
            <Card className="rounded-xl border border-border">
              <CardHeader className="border-b border-border/80 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <span>
                        {isBn ? 'শিক্ষার্থী ও অভিভাবক প্রিভিউ' : 'Student & Parent View Preview'}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isBn
                        ? 'অভিভাবক ও শিক্ষার্থীরা আপনার প্রোফাইল যেভাবে দেখতে পান তার হুবহু লাইভ সিমুলেশন।'
                        : 'Interactive live simulation of your public profile in the student marketplace.'}
                    </CardDescription>
                  </div>

                  {tutorId && (
                    <Link
                      href={withLocale(`/tutors/${tutorId}`, locale)}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
                    >
                      <span>{isBn ? 'সরাসরি পাবলিক পেজ খুলুন' : 'Open Public Page'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                {/* Simulated Tutor Card */}
                <div className="rounded-xl border border-border bg-card p-6 max-w-2xl mx-auto flex flex-col gap-6">
                  {/* Tutor header */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl uppercase">
                      {form.headlineEn?.slice(0, 2) || 'TU'}
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-foreground">
                          {isBn
                            ? form.headlineBn || form.headlineEn || 'শিক্ষকের নাম'
                            : form.headlineEn || 'Tutor Name'}
                        </h3>
                        {isApproved && (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{isBn ? 'ভেরিফাইড' : 'Verified'}</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                          5.0
                        </span>
                        <span>•</span>
                        <span>
                          {form.yearsExperience
                            ? `${form.yearsExperience} ${isBn ? 'বছরের অভিজ্ঞতা' : 'yrs exp'}`
                            : 'অভিজ্ঞ শিক্ষক'}
                        </span>
                        <span>•</span>
                        <span className="font-extrabold text-primary">
                          {form.hourlyRate ? `৳${form.hourlyRate}/ঘণ্টা` : 'আলোচনা সাপেক্ষে'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bio snippet */}
                  <div className="rounded-xl bg-muted/20 p-4 border border-border/60 flex flex-col gap-1.5">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {isBn ? 'পরিচিতি বিবরণ' : 'About Tutor'}
                    </h5>
                    <p className="text-xs text-foreground leading-relaxed">
                      {isBn
                        ? form.bioBn || form.bioEn || 'কোনো বিবরণ দেওয়া হয়নি।'
                        : form.bioEn || form.bioBn || 'No bio provided.'}
                    </p>
                  </div>

                  {/* Teaching subjects pills */}
                  <div className="flex flex-col gap-2">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {isBn ? 'পাঠদান বিষয়সমূহ' : 'Teaching Subjects'}
                    </h5>
                    {configuredSubjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        {isBn ? 'কোনো বিষয় যুক্ত করা হয়নি' : 'No subjects added'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {configuredSubjects.map((sub) => (
                          <Badge key={sub.id} variant="secondary" className="px-2.5 py-1 text-xs">
                            {isBn
                              ? sub.subject?.nameBn || sub.subject?.nameEn
                              : sub.subject?.nameEn}
                            {' — '}
                            <span className="text-muted-foreground">
                              {isBn
                                ? sub.educationLevel?.nameBn || sub.educationLevel?.nameEn
                                : sub.educationLevel?.nameEn}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Student CTA simulation */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground italic">
                      {isBn
                        ? 'শিক্ষার্থী দৃশ্য: সরাসরি বুকিং ও ইনবক্স'
                        : 'Student view: Instant booking CTA'}
                    </span>
                    <Button disabled size="sm" className="text-xs gap-1.5 opacity-80">
                      <Send className="w-3.5 h-3.5" />
                      <span>{isBn ? 'বুকিং অনুরোধ পাঠান' : 'Send Booking Request'}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabContent>
        </Tabs>
      </div>
    </TutorLayout>
  );
}
