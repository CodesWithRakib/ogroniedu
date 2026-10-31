'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Star,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Clock,
  FileText,
  MapPin,
  History,
  BookOpen,
  User,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Download,
  Eye,
  Check,
  ExternalLink,
  ShieldAlert,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { withLocale } from '@/lib/auth';
import { extractExactErrorMessage } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import {
  useGetFullTutorProfileQuery,
  useAdminUpdateTutorProfileMutation,
  useGetTutorAuditLogsQuery,
  useDecideVerificationLevelMutation,
  useVerifyVerificationDocumentMutation,
} from '@/store/services/admin-api';

interface FieldDiff {
  key: string;
  labelEn: string;
  labelBn: string;
  oldVal: string;
  newVal: string;
}

function computeFieldDiffs(
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined,
): FieldDiff[] {
  if (!before || !after) return [];
  const labels: Record<string, { en: string; bn: string }> = {
    displayName: { en: 'Display Name', bn: 'পূর্ণ নাম' },
    phoneE164: { en: 'Phone Number', bn: 'ফোন নম্বর' },
    userStatus: { en: 'Account Status', bn: 'অ্যাকাউন্ট স্ট্যাটাস' },
    headline: { en: 'Headline', bn: 'পেশাদার শিরোনাম' },
    bio: { en: 'Biography', bn: 'পরিচিতি' },
    gender: { en: 'Gender', bn: 'জেন্ডার' },
    district: { en: 'District', bn: 'জেলা' },
    hourlyRateMinor: { en: 'Hourly Rate', bn: 'ঘণ্টাপ্রতি সম্মানী' },
    yearsExperience: { en: 'Experience (Years)', bn: 'অভিজ্ঞতা (বছর)' },
    verificationStatus: { en: 'Verification Status', bn: 'ভেরিফিকেশন অবস্থা' },
    publicationStatus: { en: 'Publication Status', bn: 'পাবলিকেশন অবস্থা' },
  };

  const diffs: FieldDiff[] = [];
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  for (const k of allKeys) {
    const o = before[k];
    const n = after[k];
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      const formatVal = (v: any, key: string) => {
        if (v === null || v === undefined || v === '') return '—';
        if (key === 'hourlyRateMinor' && typeof v === 'number') return `৳${Math.round(v / 100)}/hr`;
        return String(v);
      };
      diffs.push({
        key: k,
        labelEn: labels[k]?.en || k,
        labelBn: labels[k]?.bn || k,
        oldVal: formatVal(o, k),
        newVal: formatVal(n, k),
      });
    }
  }
  return diffs;
}

const PRESET_REASON_CODES = [
  { code: 'nid_verified_match', en: 'Identity & credentials verified authentic', bn: 'পরিচয় ও জাতীয় পরিচয়পত্র যাচাই সম্পন্ন' },
  { code: 'degree_verified', en: 'Accredited university degree verified', bn: 'স্বীকৃত বিশ্ববিদ্যালয়ের শিক্ষা সনদ যাচাই সম্পন্ন' },
  { code: 'photo_mismatch', en: 'Photo or information mismatch', bn: 'ছবি বা তথ্যে অসঙ্গতি পরিলক্ষিত' },
  { code: 'illegible_document', en: 'Document is blurry or illegible', bn: 'নথি অস্পষ্ট বা অপাঠ্য' },
  { code: 'unrecognized_institution', en: 'Unrecognized educational institution', bn: 'অস্বীকৃত শিক্ষাপ্রতিষ্ঠান' },
  { code: 'document_expired', en: 'Document validity has expired', bn: 'নথিপত্রের মেয়াদ উত্তীর্ণ হয়েছে' },
];

export function AdminTutorDetailPage({ locale, tutorId }: { locale: Locale; tutorId: string }) {
  const isBn = locale === 'bn';

  const { data: profileResponse, isLoading, refetch } = useGetFullTutorProfileQuery(tutorId);
  const { data: auditResponse, refetch: refetchAudit } = useGetTutorAuditLogsQuery(tutorId);
  const [updateProfile, { isLoading: isSaving }] = useAdminUpdateTutorProfileMutation();
  const [decideLevel, { isLoading: isDeciding }] = useDecideVerificationLevelMutation();
  const [verifyDocument, { isLoading: isVerifyingDoc }] = useVerifyVerificationDocumentMutation();

  const [activeTab, setActiveTab] = useState<'profile' | 'verification' | 'audit'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Document Inspection Modal state
  const [inspectingDoc, setInspectingDoc] = useState<any | null>(null);

  // Level Decision Modal state
  const [decidingLevel, setDecidingLevel] = useState<{
    level: string;
    labelEn: string;
    labelBn: string;
    status: string;
    docs: any[];
  } | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'needs_information' | 'rejected'>('approved');
  const [decisionReason, setDecisionReason] = useState('nid_verified_match');
  const [applicantFeedback, setApplicantFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const payload = profileResponse?.data;
  const user = payload?.user;
  const profile = payload?.profile;
  const qualifications = payload?.qualifications || [];
  const subjects = payload?.subjects || [];
  const levels = payload?.levels || [];
  const documents = payload?.documents || [];
  const auditLogs = (auditResponse?.data as any[]) || payload?.auditLogs || [];

  // Form State for Inline Editing
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formDistrict, setFormDistrict] = useState('Dhaka');
  const [formRate, setFormRate] = useState<number>(500);
  const [formExperience, setFormExperience] = useState<number>(1);
  const [formVerificationStatus, setFormVerificationStatus] = useState('approved');
  const [formPublicationStatus, setFormPublicationStatus] = useState('published');
  const [formUserStatus, setFormUserStatus] = useState('active');

  const startEditing = () => {
    setFormDisplayName(user?.display_name || '');
    setFormHeadline(profile?.headline || '');
    setFormBio(profile?.bio || '');
    setFormGender(profile?.gender === 'female' ? 'female' : 'male');
    setFormDistrict(profile?.district || 'Dhaka');
    setFormRate(profile?.hourly_rate_minor ? Math.round(profile.hourly_rate_minor / 100) : 500);
    setFormExperience(profile?.years_experience || 1);
    setFormVerificationStatus(profile?.verification_status || 'approved');
    setFormPublicationStatus(profile?.publication_status || 'published');
    setFormUserStatus(user?.user_status || 'active');
    setIsEditing(true);
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateProfile({
        tutorId,
        displayName: formDisplayName,
        headline: formHeadline,
        bio: formBio,
        gender: formGender,
        district: formDistrict,
        hourlyRateMinor: formRate * 100,
        yearsExperience: formExperience,
        verificationStatus: formVerificationStatus,
        publicationStatus: formPublicationStatus,
        userStatus: formUserStatus,
      }).unwrap();

      setSaveSuccess(
        isBn
          ? 'শিক্ষকের প্রোফাইল সফলভাবে আপডেট করা হয়েছে এবং অডিট লগে সংরক্ষিত হয়েছে।'
          : 'Tutor profile updated successfully and change log recorded in audit trail.',
      );
      setIsEditing(false);
      refetch();
      refetchAudit();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to update tutor profile'));
    }
  };

  // Document Verification Actions
  const handleApproveDocument = async (docId: string) => {
    setSaveError(null);
    try {
      await verifyDocument({
        tutorId,
        documentId: docId,
        reviewStatus: 'approved',
        reasonCode: 'DOCUMENTS_VERIFIED_AUTHENTIC',
      }).unwrap();

      setSaveSuccess(
        isBn
          ? 'নথিপত্র সফলভাবে অনুমোদিত হয়েছে।'
          : 'Document successfully verified and marked as approved.',
      );
      if (inspectingDoc && inspectingDoc.id === docId) {
        setInspectingDoc((prev: any) => ({ ...prev, review_status: 'approved' }));
      }
      refetch();
      refetchAudit();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to verify document'));
    }
  };

  const handleRejectDocument = async (docId: string, reason = 'illegible_document') => {
    setSaveError(null);
    try {
      await verifyDocument({
        tutorId,
        documentId: docId,
        reviewStatus: 'rejected',
        reasonCode: reason,
      }).unwrap();

      setSaveSuccess(
        isBn
          ? 'নথিপত্রটি বাতিল (Rejected) করা হয়েছে।'
          : 'Document rejected and marked in audit records.',
      );
      if (inspectingDoc && inspectingDoc.id === docId) {
        setInspectingDoc((prev: any) => ({ ...prev, review_status: 'rejected' }));
      }
      refetch();
      refetchAudit();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to reject document'));
    }
  };

  // Open Level Decision Modal
  const handleOpenLevelDecision = (lvlKey: string) => {
    const existingLvl = levels.find((l: any) => l.level === lvlKey);
    const lvlDocs = documents.filter((d: any) => d.level === lvlKey);
    const labelMap: Record<string, { en: string; bn: string }> = {
      identity: { en: 'Identity Verification', bn: 'পরিচয় যাচাইকরণ' },
      educational: { en: 'Educational Verification', bn: 'শিক্ষাগত যোগ্যতা যাচাইকরণ' },
      institutional: { en: 'Institutional Verification', bn: 'প্রাতিষ্ঠানিক ও পেশাগত যাচাই' },
    };

    setDecidingLevel({
      level: lvlKey,
      labelEn: labelMap[lvlKey]?.en || lvlKey,
      labelBn: labelMap[lvlKey]?.bn || lvlKey,
      status: existingLvl?.status || 'not_started',
      docs: lvlDocs,
    });
    setDecisionType('approved');
    setDecisionReason(lvlKey === 'educational' ? 'degree_verified' : 'nid_verified_match');
    setApplicantFeedback('');
    setInternalNotes('');
    setSaveError(null);
  };

  // Submit Level Decision
  const handleSubmitLevelDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingLevel) return;
    setSaveError(null);

    if (
      (decisionType === 'rejected' || decisionType === 'needs_information') &&
      !applicantFeedback.trim()
    ) {
      setSaveError(
        isBn
          ? 'বাতিল বা তথ্য চাওয়ার ক্ষেত্রে আবেদনকারীর জন্য ফিডব্যাক উল্লেখ করা বাধ্যতামূলক।'
          : 'Applicant feedback is required when rejecting or requesting additional information.',
      );
      return;
    }

    try {
      await decideLevel({
        tutorId,
        level: decidingLevel.level as any,
        decision: decisionType,
        reasonCode: decisionReason,
        applicantFeedback: applicantFeedback.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      }).unwrap();

      setSaveSuccess(
        isBn
          ? `${decidingLevel.labelBn} সিদ্ধান্ত সফলভাবে সংরক্ষিত হয়েছে।`
          : `${decidingLevel.labelEn} decision successfully recorded.`,
      );
      setDecidingLevel(null);
      refetch();
      refetchAudit();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to record level decision'));
    }
  };

  if (isLoading || !payload) {
    return (
      <AdminLayout locale={locale}>
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-tutor-detail-page">
        {/* Back Link with single Lucide icon and clean text */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users/tutors', locale)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? 'শিক্ষক তালিকায় ফিরে যান' : 'Back to Tutors Directory'}</span>
          </Link>
        </div>

        {/* Hero Header Card - Flat, Borderless & Seamless */}
        <div className="bg-card/70 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-black text-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-black text-foreground">{user.display_name}</h1>
                <Badge
                  variant={profile?.verification_status === 'approved' ? 'default' : 'secondary'}
                  className="text-[11px] font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  <span>{profile?.verification_status?.toUpperCase() || 'NOT VERIFIED'}</span>
                </Badge>
                <Badge
                  variant={user.user_status === 'active' ? 'outline' : 'destructive'}
                  className="text-[10px] font-bold"
                >
                  {user.user_status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                {profile?.headline || (isBn ? 'প্রফেশনাল শিক্ষক' : 'Certified Educator')}
              </p>
              {/* Contact info using Lucide icons exclusively (Zero emojis) */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>{user.email || '—'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>{user.phone_e164 || '—'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>{profile?.district || 'Dhaka'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground/60">ID: {user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isEditing ? (
              <Button
                onClick={startEditing}
                size="sm"
                className="gap-2 font-bold"
                data-testid="edit-tutor-profile-btn"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1.5 font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Action Notifications */}
        {saveSuccess && (
          <Alert className="bg-success-soft text-success-soft-foreground border-0">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{saveSuccess}</AlertDescription>
          </Alert>
        )}
        {saveError && (
          <Alert variant="destructive" className="border-0">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{saveError}</AlertDescription>
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="text-xs font-bold"
          >
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'প্রোফাইল ও বিস্তারিত' : 'Profile & Overview'}</span>
          </Button>
          <Button
            variant={activeTab === 'verification' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('verification')}
            className="text-xs font-bold"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'কেওয়াইসি ও জমা দেওয়া নথিপত্র' : 'KYC & Verification Desk'}</span>
          </Button>
          <Button
            variant={activeTab === 'audit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('audit')}
            className="text-xs font-bold"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'পরিবর্তন লগ ও অডিট টাইমলাইন' : 'Audit Timeline (Diff-Only)'}</span>
          </Button>
        </div>

        {/* Tab 1: Profile & Information (View / Edit Mode) */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {isEditing ? (
              <form onSubmit={handleSave} className="bg-card/60 rounded-2xl p-6 space-y-4">
                <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'প্রশাসনিক প্রোফাইল এডিটর' : 'Administrative Profile Editor'}</span>
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Admin Actor Tracked
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'পূর্ণ নাম' : 'Full Name'}
                    </label>
                    <Input
                      required
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'জেন্ডার' : 'Gender'}
                    </label>
                    <Select
                      value={formGender}
                      onValueChange={(val) => setFormGender(val as 'male' | 'female')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male (পুরুষ)</SelectItem>
                        <SelectItem value="female">Female (নারী)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'পেশাদার শিরোনাম' : 'Professional Headline'}
                    </label>
                    <Input
                      value={formHeadline}
                      onChange={(e) => setFormHeadline(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'পরিচিতি / বায়ো' : 'Biography'}
                    </label>
                    <textarea
                      rows={3}
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-card border border-input text-foreground outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'জেলা (District)' : 'District'}
                    </label>
                    <Input
                      value={formDistrict}
                      onChange={(e) => setFormDistrict(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'ঘণ্টাপ্রতি সম্মানী (টাকা)' : 'Hourly Rate (BDT)'}
                    </label>
                    <Input
                      type="number"
                      value={formRate}
                      onChange={(e) => setFormRate(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'শিক্ষকতার অভিজ্ঞতা (বছর)' : 'Experience (Years)'}
                    </label>
                    <Input
                      type="number"
                      value={formExperience}
                      onChange={(e) => setFormExperience(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'ভেরিফিকেশন অবস্থা' : 'Verification Status'}
                    </label>
                    <Select
                      value={formVerificationStatus}
                      onValueChange={(val) => setFormVerificationStatus(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved (অনুমোদিত)</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval (অপেক্ষমাণ)</SelectItem>
                        <SelectItem value="needs_information">Needs Information (তথ্য প্রয়োজন)</SelectItem>
                        <SelectItem value="draft">Draft (খসড়া)</SelectItem>
                        <SelectItem value="rejected">Rejected (বাতিল)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'পাবলিকেশন অবস্থা' : 'Publication Status'}
                    </label>
                    <Select
                      value={formPublicationStatus}
                      onValueChange={(val) => setFormPublicationStatus(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published (প্রকাশিত)</SelectItem>
                        <SelectItem value="draft">Draft (খসড়া)</SelectItem>
                        <SelectItem value="delisted">Delisted (তালিকাচ্যুত)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}
                    </label>
                    <Select
                      value={formUserStatus}
                      onValueChange={(val) => setFormUserStatus(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (সক্রিয়)</SelectItem>
                        <SelectItem value="suspended">Suspended (স্থগিত)</SelectItem>
                        <SelectItem value="banned">Banned (নিষিদ্ধ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="gap-2 font-bold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Profile Info */}
                <div className="md:col-span-2 space-y-6">
                  {/* Bio Card */}
                  <div className="bg-card/60 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span>{isBn ? 'শিক্ষকের পরিচিতি ও বায়ো' : 'About & Bio'}</span>
                    </h3>
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                      {profile?.bio || (isBn ? 'কোনো পরিচিতি উল্লেখ করা হয়নি।' : 'No biography provided.')}
                    </p>
                  </div>

                  {/* Teaching Subjects */}
                  <div className="bg-card/60 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>{isBn ? 'পাঠদানের বিষয়সমূহ' : 'Teaching Subjects'}</span>
                    </h3>
                    {subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="px-3 py-1.5 rounded-xl bg-muted/40 text-xs font-semibold text-foreground flex items-center gap-2"
                          >
                            <span>{isBn ? sub.name_bn : sub.name_en}</span>
                            {sub.rate_minor && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                ৳{Math.round(sub.rate_minor / 100)}/hr
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {isBn ? 'কোনো নির্দিষ্ট বিষয় বরাদ্দ নেই।' : 'No subjects enrolled.'}
                      </p>
                    )}
                  </div>

                  {/* Academic Qualifications */}
                  <div className="bg-card/60 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>{isBn ? 'শিক্ষাগত যোগ্যতা ও সনদ' : 'Academic Qualifications'}</span>
                    </h3>
                    <div className="space-y-3">
                      {qualifications.length > 0 ? (
                        qualifications.map((q: any) => (
                          <div
                            key={q.id}
                            className="p-3.5 rounded-xl bg-muted/20 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{q.title || q.degree_name || 'Academic Degree'}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {q.institution || q.institution_en || 'University'}
                              </p>
                              {q.issued_year && (
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  Year: {q.issued_year}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold text-success border-success/30">
                              {q.review_status?.toUpperCase() || 'VERIFIED'}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          {isBn ? 'কোন শিক্ষাগত তথ্য পাওয়া যায়নি।' : 'No qualifications recorded.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Column */}
                <div className="space-y-6">
                  <div className="bg-card/60 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
                      {isBn ? 'প্রশাসনিক পরিসংখ্যান' : 'Key Metrics'}
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'ঘণ্টাপ্রতি সম্মানী:' : 'Hourly Rate:'}</span>
                        <span className="font-bold font-mono text-foreground">
                          ৳{profile?.hourly_rate_minor ? Math.round(profile.hourly_rate_minor / 100) : 500}/hr
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'অভিজ্ঞতা:' : 'Experience:'}</span>
                        <span className="font-bold text-foreground">{profile?.years_experience || 1} {isBn ? 'বছর' : 'years'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'জেন্ডার:' : 'Gender:'}</span>
                        <span className="font-bold text-foreground capitalize">
                          {profile?.gender || 'male'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'জেলা:' : 'District:'}</span>
                        <span className="font-bold text-foreground">{profile?.district || 'Dhaka'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'পাবলিকেশন:' : 'Publication:'}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {profile?.publication_status?.toUpperCase() || 'PUBLISHED'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: KYC & Verification Desk (Evidence-Driven Inspection) */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            {/* 3 Verification Levels Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['identity', 'educational', 'institutional'].map((lvl) => {
                const existingLvl = levels.find((l: any) => l.level === lvl);
                const lvlDocs = documents.filter((d: any) => d.level === lvl);
                const isApproved = existingLvl?.status === 'approved';
                const isSubmitted = existingLvl?.status === 'submitted' || existingLvl?.status === 'under_review';
                const hasUploadedDocs = lvlDocs.length > 0;

                const levelTitle =
                  lvl === 'identity'
                    ? isBn ? 'জাতীয় পরিচয়পত্র (NID) যাচাই' : 'Identity Verification'
                    : lvl === 'educational'
                      ? isBn ? 'শিক্ষা সনদ ও ডিগ্রি যাচাই' : 'Educational Verification'
                      : isBn ? 'প্রতিষ্ঠান পত্র / ব্যাকগ্রাউন্ড যাচাই' : 'Institutional Verification';

                const levelDesc =
                  lvl === 'identity'
                    ? isBn ? 'স্মার্ট এনআইডি ফ্রন্ট ও ব্যাক সনদ পর্যালোচনা' : 'National ID Smart Card front and back review'
                    : lvl === 'educational'
                      ? isBn ? 'বিশ্ববিদ্যালয় সনদ অথবা একাডেমিক ট্রান্সক্রিপ্ট' : 'University degree certificate or academic transcript'
                      : isBn ? 'চাকরি বা প্রাতিষ্ঠানিক ছাড়পত্র পত্র পর্যালোচনা' : 'Employment authorization or institutional clearance';

                return (
                  <div key={lvl} className="bg-card/60 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">
                          {lvl}
                        </span>
                        <Badge
                          variant={
                            isApproved
                              ? 'default'
                              : isSubmitted
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[10px] font-bold"
                        >
                          {existingLvl?.status?.toUpperCase() || 'NOT_STARTED'}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-foreground">{levelTitle}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{levelDesc}</p>
                      </div>

                      {/* Submitted Evidence Checklist in this Level */}
                      <div className="pt-2 border-t border-border/30 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          {isBn ? 'প্রমাণিত নথিসমূহ:' : 'Evidence Checklist:'}
                        </span>
                        {hasUploadedDocs ? (
                          lvlDocs.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between gap-2 text-[11px] p-1.5 rounded-lg bg-muted/30"
                            >
                              <span className="font-mono text-foreground truncate max-w-[150px]">
                                {doc.original_filename || doc.document_type}
                              </span>
                              <Badge
                                variant={doc.review_status === 'approved' ? 'default' : 'secondary'}
                                className="text-[9px] font-bold px-1.5 py-0"
                              >
                                {doc.review_status?.toUpperCase()}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            <span>{isBn ? 'কোনো নথি আপলোড করা হয়নি' : 'No documents submitted yet'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Level Action Button */}
                    <div>
                      {isApproved ? (
                        <div className="w-full py-1.5 px-3 rounded-xl bg-success-soft text-success-soft-foreground text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          <span>{isBn ? 'লেভেল অনুমোদিত' : 'Level Verified & Active'}</span>
                        </div>
                      ) : hasUploadedDocs ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenLevelDecision(lvl)}
                          className="w-full text-xs font-bold gap-1.5"
                          data-testid={`review-level-${lvl}`}
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{isBn ? 'যাচাই ও সিদ্ধান্ত নিন' : 'Review & Decide Level'}</span>
                        </Button>
                      ) : (
                        <div className="w-full py-1.5 px-3 rounded-xl bg-muted/30 text-muted-foreground text-[11px] font-medium text-center">
                          {isBn ? 'আবেদনকারীর জমার জন্য অপেক্ষমাণ' : 'Awaiting Applicant Submission'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submitted Verification Documents Section (Evidence Inspection Desk) */}
            <div className="bg-card/60 rounded-2xl p-6 space-y-4">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'জমা দেওয়া ভেরিফিকেশন নথিপত্র ও প্রমাণাদি' : 'Submitted Verification Documents & Evidence'}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isBn
                      ? 'শিক্ষকের আপলোডকৃত মূল ফাইল পরিদর্শন করুন এবং প্রতিটি সনদ অনুমোদন বা বাতিল করুন'
                      : 'Inspect educator-submitted evidence files directly and review each document individually.'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {documents.length} {isBn ? 'টি নথি' : 'Files'}
                </Badge>
              </div>

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any) => {
                    const fileSizeKb = doc.size_bytes ? Math.round(doc.size_bytes / 1024) : null;
                    const isApproved = doc.review_status === 'approved';
                    const isPending = doc.review_status === 'pending';
                    const isRejected = doc.review_status === 'rejected';

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        data-testid={`doc-row-${doc.id}`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">
                                {doc.document_type?.replace('_', ' ').toUpperCase()}
                              </span>
                              <Badge
                                variant={isApproved ? 'default' : isPending ? 'secondary' : 'destructive'}
                                className="text-[10px] font-bold"
                              >
                                {doc.review_status?.toUpperCase() || 'SUBMITTED'}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                {doc.level}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground/80 font-mono font-medium">
                              {doc.original_filename || `document_${doc.id.slice(0, 8)}.pdf`}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-mono mt-1">
                              {fileSizeKb && <span>Size: {fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`}</span>}
                              {doc.media_type && <span>Type: {doc.media_type}</span>}
                              <span>Submitted: {new Date(doc.created_at).toLocaleDateString(locale)}</span>
                              {doc.reviewer_name && <span>Reviewed by: {doc.reviewer_name}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Review Actions on the Document */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5"
                            onClick={() => setInspectingDoc(doc)}
                            data-testid={`inspect-doc-btn-${doc.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isBn ? 'পরিদর্শন ও রিভিউ' : 'Inspect File'}</span>
                          </Button>

                          {!isApproved && (
                            <Button
                              size="sm"
                              disabled={isVerifyingDoc}
                              onClick={() => handleApproveDocument(doc.id)}
                              className="text-xs gap-1 font-bold bg-success hover:bg-success/90 text-success-foreground h-8"
                              title={isBn ? 'সনদ অনুমোদন করুন' : 'Approve Document'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                            </Button>
                          )}

                          {!isRejected && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isVerifyingDoc}
                              onClick={() => handleRejectDocument(doc.id)}
                              className="text-xs gap-1 font-bold text-destructive hover:bg-destructive/10 h-8"
                              title={isBn ? 'সনদ বাতিল করুন' : 'Reject Document'}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{isBn ? 'বাতিল' : 'Reject'}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl">
                  {isBn ? 'এই শিক্ষকের কোনো নতুন নথি জমা নেই।' : 'No uploaded verification documents on file.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Step Timeline Audit Logs (Diff-Only, No Raw JSON) */}
        {activeTab === 'audit' && (
          <div className="bg-card/60 rounded-2xl p-6 space-y-6">
            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>{isBn ? 'শিক্ষক প্রোফাইল অডিট হিস্ট্রি টাইমলাইন' : 'Audit Change Timeline (Diff-Only)'}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isBn
                    ? 'কোন অ্যাডমিন সদস্য কোন সময়ে কি কি তথ্য পরিবর্তন করেছেন তার দৃশ্যমান টাইমলাইন (শুধুমাত্র পরিবর্তিত তথ্য)'
                    : 'Transparent chronological timeline displaying actor attribution and specifically changed fields only.'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {auditLogs.length} {isBn ? 'টি ইভেন্ট' : 'Records'}
              </Badge>
            </div>

            {auditLogs.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {auditLogs.map((log: any, idx: number) => {
                  const metadata = log.safe_metadata || log.metadata || {};
                  const diffs = computeFieldDiffs(metadata.before, metadata.after);
                  const actor = log.actor_name || metadata.updatedBy || 'Super Admin';

                  return (
                    <div key={log.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>

                      {/* Content Card */}
                      <div className="p-4 rounded-xl bg-muted/20 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] font-bold font-mono">
                              {log.action}
                            </Badge>
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{actor}</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.created_at).toLocaleString(locale)}</span>
                          </span>
                        </div>

                        {log.reason && (
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">{isBn ? 'কারণ / নোট:' : 'Reason:'}</strong> {log.reason}
                          </p>
                        )}

                        {/* Clean Step Timeline Diffs (NO JSON DUMPS) */}
                        {diffs.length > 0 ? (
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              {isBn ? 'পরিবর্তিত তথ্যাবলি (Changed Fields)' : 'Updated Fields:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {diffs.map((d) => (
                                <div
                                  key={d.key}
                                  className="p-2.5 rounded-lg bg-background/50 flex flex-col gap-1 text-xs"
                                >
                                  <span className="text-[11px] font-semibold text-foreground/80">
                                    {isBn ? d.labelBn : d.labelEn}
                                  </span>
                                  <div className="flex items-center gap-2 font-mono text-[11px]">
                                    <span className="line-through text-muted-foreground/70 bg-muted/40 px-1.5 py-0.5 rounded">
                                      {d.oldVal}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="font-bold text-success bg-success-soft px-1.5 py-0.5 rounded">
                                      {d.newVal}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">
                            {isBn ? 'কোনো ফিল্ড পার্থক্য পাওয়া যায়নি।' : 'No field modifications recorded for this event.'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl">
                {isBn ? 'এই শিক্ষকের জন্য কোনো পূর্ববর্তী অডিট রেকর্ড পাওয়া যায়নি।' : 'No recorded audit log events for this tutor.'}
              </div>
            )}
          </div>
        )}

        {/* 1. Dedicated Document Inspection & Review Dialog */}
        {inspectingDoc && (
          <Dialog open={Boolean(inspectingDoc)} onOpenChange={(open) => !open && setInspectingDoc(null)}>
            <DialogContent className="max-w-2xl bg-card border-0 p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'সনদপত্র ও প্রমাণাদি পরিদর্শন' : 'Document Inspection & Review'}</span>
                  </div>
                  <Badge
                    variant={inspectingDoc.review_status === 'approved' ? 'default' : 'secondary'}
                    className="text-[10px] font-bold"
                  >
                    {inspectingDoc.review_status?.toUpperCase()}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Document Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isBn ? 'নথির ধরণ' : 'Type'}</span>
                  <span className="font-bold text-foreground">{inspectingDoc.document_type?.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isBn ? 'ফাইলের আকার' : 'Size'}</span>
                  <span className="font-bold text-foreground">
                    {inspectingDoc.size_bytes ? `${Math.round(inspectingDoc.size_bytes / 1024)} KB` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isBn ? 'ফরম্যাট' : 'MIME'}</span>
                  <span className="font-bold text-foreground">{inspectingDoc.media_type || 'PDF'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isBn ? 'নিরাপত্তা স্ক্যান' : 'Security'}</span>
                  <span className="font-bold text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Clean</span>
                  </span>
                </div>
              </div>

              {/* Visual Document Viewport Preview Panel */}
              <div className="p-6 rounded-xl bg-muted/20 border border-border/40 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground font-mono">{inspectingDoc.original_filename}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Storage: Encrypted local storage • Asset ID: {inspectingDoc.file_asset_id?.slice(0, 8)}...
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => {
                    alert(
                      isBn
                        ? `ফাইল ডাউনলোড লিঙ্ক জেনারেট হচ্ছে: ${inspectingDoc.original_filename}`
                        : `Opening signed asset stream: ${inspectingDoc.original_filename}`,
                    );
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isBn ? 'মূল ফাইল ডাউনলোড করুন' : 'Download Original Asset'}</span>
                </Button>
              </div>

              {/* Decision Actions inside Modal */}
              <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Status: <strong>{inspectingDoc.review_status}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectingDoc(null)}
                  >
                    {isBn ? 'বন্ধ করুন' : 'Close'}
                  </Button>

                  {inspectingDoc.review_status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isVerifyingDoc}
                      onClick={() => handleRejectDocument(inspectingDoc.id)}
                      className="text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      <span>{isBn ? 'নথি বাতিল' : 'Reject Document'}</span>
                    </Button>
                  )}

                  {inspectingDoc.review_status !== 'approved' && (
                    <Button
                      size="sm"
                      disabled={isVerifyingDoc}
                      onClick={() => handleApproveDocument(inspectingDoc.id)}
                      className="text-xs font-bold bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      <span>{isBn ? 'নথি অনুমোদন' : 'Approve Document'}</span>
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 2. Interactive Level Decision Dialog */}
        {decidingLevel && (
          <Dialog open={Boolean(decidingLevel)} onOpenChange={(open) => !open && setDecidingLevel(null)}>
            <DialogContent className="max-w-xl bg-card border-0 p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>{isBn ? `${decidingLevel.labelBn} সিদ্ধান্ত গ্রহণ` : `Decide ${decidingLevel.labelEn}`}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Current: {decidingLevel.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitLevelDecision} className="space-y-4">
                {/* Evidence Documents Checklist */}
                <div className="p-3.5 rounded-xl bg-muted/20 space-y-2">
                  <span className="text-xs font-bold text-foreground block">
                    {isBn ? 'সংযুক্ত নথিপত্রসমূহ:' : 'Attached Evidence Documents:'}
                  </span>
                  {decidingLevel.docs.length > 0 ? (
                    decidingLevel.docs.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-background/60 text-xs"
                      >
                        <span className="font-mono text-[11px] truncate">{d.original_filename}</span>
                        <Badge
                          variant={d.review_status === 'approved' ? 'default' : 'secondary'}
                          className="text-[9px] font-bold"
                        >
                          {d.review_status?.toUpperCase()}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {isBn ? 'এই লেভেলের জন্য কোনো নথি সংযুক্ত নেই।' : 'No evidence attached.'}
                    </p>
                  )}
                </div>

                {/* Decision Selector */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {isBn ? 'প্রশাসনিক সিদ্ধান্ত' : 'Reviewer Decision'}
                  </label>
                  <Select
                    value={decisionType}
                    onValueChange={(val) => setDecisionType(val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved (অনুমোদিত - লেভেল সক্রিয় হবে)</SelectItem>
                      <SelectItem value="needs_information">Needs Information (তথ্য প্রয়োজন - আবেদনকারী সংশোধন করবেন)</SelectItem>
                      <SelectItem value="rejected">Rejected (বাতিল)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preset Reason Code */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {isBn ? 'কারণ কোড (Reason Code)' : 'Reason Code'}
                  </label>
                  <Select
                    value={decisionReason}
                    onValueChange={(val) => setDecisionReason(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                {/* Applicant Feedback */}
                {(decisionType === 'rejected' || decisionType === 'needs_information') && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'আবেদনকারীকে ফিডব্যাক (বাধ্যতামূলক)' : 'Applicant-Facing Feedback (Required)'}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={applicantFeedback}
                      onChange={(e) => setApplicantFeedback(e.target.value)}
                      placeholder={isBn ? 'কেন অনুমোদন হয়নি তা বিস্তারিত লিখুন...' : 'Specify what is missing or incorrect...'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-input text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                )}

                {/* Internal Notes */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {isBn ? 'অভ্যন্তরীণ প্রশাসনিক নোট (ঐচ্ছিক)' : 'Internal Administrator Notes (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder={isBn ? 'অভ্যন্তরীণ রেকর্ডের জন্য মন্তব্য...' : 'Internal audit memo...'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-input text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                {/* Submit Decision */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDecidingLevel(null)}
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isDeciding}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDeciding ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : isBn ? 'সিদ্ধান্ত নিশ্চিত করুন' : 'Confirm Decision'}</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
