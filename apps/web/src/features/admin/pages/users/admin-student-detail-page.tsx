'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Ban,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Clock,
  History,
  BookOpen,
  User,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  LogOut,
  ExternalLink,
  Users,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  useGetStudentOrGuardianDossierQuery,
  useUpdateStudentOrGuardianMutation,
  useForceLogoutUserMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
} from '@/store/services/admin-api';

interface FieldDiff {
  key: string;
  labelEn: string;
  labelBn: string;
  oldVal: string;
  newVal: string;
}

function computeStudentDiffs(
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined,
): FieldDiff[] {
  if (!before || !after) return [];
  const labels: Record<string, { en: string; bn: string }> = {
    displayName: { en: 'Display Name', bn: 'পূর্ণ নাম' },
    phoneE164: { en: 'Phone Number', bn: 'ফোন নম্বর' },
    status: { en: 'Account Status', bn: 'অ্যাকাউন্ট স্ট্যাটাস' },
    preferredLocale: { en: 'Preferred Language', bn: 'পছন্দের ভাষা' },
  };

  const diffs: FieldDiff[] = [];
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  for (const k of allKeys) {
    const o = before[k];
    const n = after[k];
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      diffs.push({
        key: k,
        labelEn: labels[k]?.en || k,
        labelBn: labels[k]?.bn || k,
        oldVal: o ? String(o) : '—',
        newVal: n ? String(n) : '—',
      });
    }
  }
  return diffs;
}

export function AdminStudentDetailPage({ locale, userId }: { locale: Locale; userId: string }) {
  const isBn = locale === 'bn';

  const { data: dossierResponse, isLoading, refetch } = useGetStudentOrGuardianDossierQuery(userId);
  const [updateUser, { isLoading: isSaving }] = useUpdateStudentOrGuardianMutation();
  const [forceLogout, { isLoading: isLoggingOut }] = useForceLogoutUserMutation();
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();

  const [activeTab, setActiveTab] = useState<'overview' | 'tuitions' | 'audit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const payload = dossierResponse?.data;
  const user = payload?.user;
  const userType = payload?.userType;
  const canMakeDirectPayment = payload?.canMakeDirectPayment ?? false;
  const personaLabelEn = payload?.personaLabelEn || '';
  const personaLabelBn = payload?.personaLabelBn || '';
  const linkedGuardian = payload?.linkedGuardian;
  const linkedChildren = payload?.linkedChildren || [];
  const tuitionRequests = payload?.tuitionRequests || [];
  const bookings = payload?.bookings || [];
  const auditLogs = payload?.auditLogs || [];

  // Edit form state
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formLocale, setFormLocale] = useState('bn');

  const startEditing = () => {
    setFormDisplayName(user?.displayName || '');
    setFormPhone(user?.phoneE164 || '');
    setFormStatus(user?.status || 'active');
    setFormLocale(user?.preferredLocale || 'bn');
    setIsEditing(true);
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateUser({
        id: userId,
        displayName: formDisplayName,
        phoneE164: formPhone || undefined,
        status: formStatus,
        preferredLocale: formLocale,
      }).unwrap();

      setSaveSuccess(
        isBn
          ? 'অ্যাকাউন্ট তথ্য সফলভাবে হালনাগাদ করা হয়েছে এবং অডিট লগে রেকর্ড হয়েছে।'
          : 'User profile updated successfully and change recorded in audit log.',
      );
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to update user profile'));
    }
  };

  const handleForceLogout = async () => {
    if (
      !confirm(
        isBn
          ? `আপনি কি ${user?.displayName}-এর সক্রিয় সেশন তাৎক্ষণিকভাবে বাতিল করতে চান?`
          : `Terminate active login session for ${user?.displayName}?`,
      )
    )
      return;

    try {
      await forceLogout(userId).unwrap();
      setSaveSuccess(
        isBn
          ? 'সক্রিয় সেশন সফলভাবে টার্মিনেট করা হয়েছে (Auth Epoch বৃদ্ধি পেয়েছে)।'
          : 'Session terminated immediately. User logged out on next request.',
      );
      refetch();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to force logout user'));
    }
  };

  const handleToggleStatus = async () => {
    const isActive = user?.status === 'active';
    const confirmMsg = isActive
      ? isBn
        ? `আপনি কি ${user?.displayName}-কে স্থগিত (Suspend) করতে চান?`
        : `Suspend account for ${user?.displayName}? Login will be blocked immediately.`
      : isBn
        ? `আপনি কি ${user?.displayName}-এর অ্যাকাউন্ট সক্রিয় করতে চান?`
        : `Reactivate account for ${user?.displayName}?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (isActive) {
        await suspendUser({ id: userId, reason: 'Administrative suspension' }).unwrap();
        setSaveSuccess(isBn ? 'অ্যাকাউন্ট স্থগিত করা হয়েছে।' : 'Account suspended successfully.');
      } else {
        await reactivateUser(userId).unwrap();
        setSaveSuccess(isBn ? 'অ্যাকাউন্ট সক্রিয় করা হয়েছে।' : 'Account reactivated successfully.');
      }
      refetch();
    } catch (err: any) {
      setSaveError(extractExactErrorMessage(err, 'Failed to modify account status'));
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

  const isGuardian = userType === 'guardian';
  const isStandalone = userType === 'standalone_student';
  const isChild = userType === 'child_student';
  const isActive = user?.status === 'active';

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-student-detail-page">
        {/* Back Link with single Lucide icon (Zero double arrows) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users/students', locale)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? 'শিক্ষার্থী ও অভিভাবক তালিকায় ফিরে যান' : 'Back to Students & Guardians'}</span>
          </Link>
        </div>

        {/* Hero Header Card - Flat, Borderless & Seamless */}
        <div className="bg-card/70 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 rounded-2xl font-black text-xl flex items-center justify-center shrink-0 ${
                isGuardian
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : isStandalone
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}
            >
              {isGuardian ? (
                <ShieldCheck className="w-8 h-8" />
              ) : isStandalone ? (
                <UserCheck className="w-8 h-8" />
              ) : (
                <GraduationCap className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-black text-foreground">{user?.displayName}</h1>
                <Badge
                  variant={isGuardian ? 'default' : 'secondary'}
                  className="text-[11px] font-bold uppercase tracking-wider"
                >
                  {isBn ? personaLabelBn : personaLabelEn}
                </Badge>
                <Badge
                  variant={isActive ? 'outline' : 'destructive'}
                  className="text-[10px] font-bold"
                >
                  {user?.status?.toUpperCase()}
                </Badge>
              </div>

              {/* Payment Authority Pill */}
              <div className="flex items-center gap-2 mb-2">
                {canMakeDirectPayment ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
                    <CreditCard className="w-3 h-3" />
                    <span>{isBn ? 'সরাসরি টিউশন পেমেন্ট সক্ষম' : 'Authorized for Direct Payment & Booking'}</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 font-medium">
                    <Ban className="w-3 h-3" />
                    <span>{isBn ? 'নাবালক শিক্ষার্থী (পেমেন্ট নিষিদ্ধ)' : 'Minor Student (No Direct Payment)'}</span>
                  </Badge>
                )}
              </div>

              {/* Contact info using Lucide icons exclusively (Zero emojis) */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>{user?.email || '—'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>{user?.phoneE164 || '—'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground/60">ID: {user?.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isEditing ? (
              <Button
                onClick={startEditing}
                size="sm"
                className="gap-2 font-bold"
                data-testid="edit-student-profile-btn"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রোফাইল এডিট' : 'Edit Profile'}</span>
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

            <Button
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              onClick={handleForceLogout}
              className="gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700"
              title="Force logout active sessions"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isBn ? 'সেশন টার্মিনেট' : 'Force Logout'}</span>
            </Button>

            <Button
              variant={isActive ? 'destructive' : 'default'}
              size="sm"
              disabled={isSuspending || isReactivating}
              onClick={handleToggleStatus}
              className="gap-1.5 font-bold"
            >
              <span>{isActive ? (isBn ? 'অ্যাকাউন্ট স্থগিত' : 'Suspend Account') : isBn ? 'পুনরায় সক্রিয়' : 'Reactivate'}</span>
            </Button>
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
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="text-xs font-bold"
          >
            <User className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'ওভারভিউ ও পারিবারিক সম্পর্ক' : 'Overview & Family Links'}</span>
          </Button>
          <Button
            variant={activeTab === 'tuitions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('tuitions')}
            className="text-xs font-bold"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'টিউশন রিকুয়েস্ট ও বুকিং' : 'Tuition Requests & Bookings'}</span>
          </Button>
          <Button
            variant={activeTab === 'audit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('audit')}
            className="text-xs font-bold"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span>{isBn ? 'অডিট হিস্ট্রি টাইমলাইন' : 'Audit Timeline (Diff-Only)'}</span>
          </Button>
        </div>

        {/* Tab 1: Overview & Family Relationships */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isEditing ? (
              <form onSubmit={handleSave} className="bg-card/60 rounded-2xl p-6 space-y-4">
                <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'প্রশাসনিক অ্যাকাউন্ট এডিটর' : 'Administrative Account Editor'}</span>
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
                      {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                    </label>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}
                    </label>
                    <Select
                      value={formStatus}
                      onValueChange={(val) => setFormStatus(val)}
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

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {isBn ? 'পছন্দের ভাষা' : 'Preferred Language'}
                    </label>
                    <Select
                      value={formLocale}
                      onValueChange={(val) => setFormLocale(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bn">Bangla (বাংলা)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
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
                {/* Family Links Card */}
                <div className="md:col-span-2 space-y-6">
                  {/* Linked Children (For Guardians) */}
                  {isGuardian && (
                    <div className="bg-card/60 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{isBn ? 'সংযুক্ত সন্তান শিক্ষার্থী তালিকা' : 'Linked Dependent Children'}</span>
                        </h3>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {linkedChildren.length} {isBn ? 'জন' : 'Enrolled'}
                        </Badge>
                      </div>

                      {linkedChildren.length > 0 ? (
                        <div className="space-y-3">
                          {linkedChildren.map((child: any) => (
                            <div
                              key={child.id}
                              className="p-4 rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-foreground">{child.name}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    {child.email || child.phone || 'No direct contact'}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                                    Relation: {child.relationship || 'Child'}
                                  </Badge>
                                </div>
                              </div>

                              <Link
                                href={withLocale(`/dashboard/admin/users/students/${child.id}`, locale)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                              >
                                <span>{isBn ? 'সন্তানের ৩৬০° প্রোফাইল দেখুন' : 'View 360° Dossier'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          {isBn ? 'এই অভিভাবকের সাথে কোনো সন্তান সংযুক্ত নেই।' : 'No dependent children linked yet.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Linked Guardian (For Child Students) */}
                  {isChild && (
                    <div className="bg-card/60 rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{isBn ? 'আইনগত অভিভাবক (Guardian)' : 'Responsible Legal Guardian'}</span>
                      </h3>

                      {linkedGuardian ? (
                        <div className="p-4 rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{linkedGuardian.name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {linkedGuardian.email || linkedGuardian.phone}
                              </p>
                              <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                                Relationship: {linkedGuardian.relationship || 'Guardian'}
                              </Badge>
                            </div>
                          </div>

                          <Link
                            href={withLocale(`/dashboard/admin/users/students/${linkedGuardian.id}`, locale)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>{isBn ? 'অভিভাবকের ৩৬০° প্রোফাইল দেখুন' : 'View Guardian Dossier'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          {isBn ? 'কোনো অভিভাবক সংযুক্ত পাওয়া যায়নি।' : 'No legal guardian associated.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Standalone Student Note */}
                  {isStandalone && (
                    <div className="bg-card/60 rounded-2xl p-6 space-y-3">
                      <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{isBn ? 'স্বাধীন শিক্ষার্থী পারসোনা' : 'Independent Adult Learner Persona'}</span>
                      </h3>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {isBn
                          ? 'এই শিক্ষার্থী ১৮+ প্রাপ্তবয়স্ক এবং অভিভাবক ছাড়াই স্বয়ংসম্পূর্ণভাবে টিউশন পোস্ট ও সরাসরি পেমেন্ট গেটওয়ের মাধ্যমে বুকিং সম্পন্ন করতে পারেন।'
                          : 'This learner is registered as an independent adult. They manage tuition requests directly and hold full financial authorization to make escrow tuition payments.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Metadata Column */}
                <div className="space-y-6">
                  <div className="bg-card/60 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
                      {isBn ? 'অ্যাকাউন্ট প্যারামিটার' : 'Account Parameters'}
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'পছন্দের ভাষা:' : 'Language:'}</span>
                        <span className="font-bold text-foreground uppercase">{user?.preferredLocale || 'BN'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'সেশন সংস্করণ (Epoch):' : 'Auth Epoch:'}</span>
                        <span className="font-bold font-mono text-foreground">{user?.authEpoch ?? 0}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'নিবন্ধন তারিখ:' : 'Registered:'}</span>
                        <span className="font-medium text-muted-foreground">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isBn ? 'সর্বশেষ লগইন:' : 'Last Login:'}</span>
                        <span className="font-medium text-muted-foreground">
                          {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(locale) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Tuition Requests & Bookings */}
        {activeTab === 'tuitions' && (
          <div className="space-y-6">
            {/* Tuition Requests Section */}
            <div className="bg-card/60 rounded-2xl p-6 space-y-4">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'টিউশন রিকুয়েস্টসমূহ' : 'Tuition Requests'}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isBn ? 'এই অ্যাকাউন্ট থেকে পোস্টকৃত টিউশন রিকুয়েস্ট' : 'Job requisitions submitted by or for this learner.'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {tuitionRequests.length} {isBn ? 'টি' : 'Items'}
                </Badge>
              </div>

              {tuitionRequests.length > 0 ? (
                <div className="space-y-3">
                  {tuitionRequests.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground font-mono">{req.request_reference || req.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {req.status?.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {req.learning_mode?.toUpperCase() || 'OFFLINE'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {req.student_name ? `Student: ${req.student_name} • ` : ''}
                          Location: {req.district || 'Dhaka'}, {req.area || 'All areas'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Budget: ৳{req.salary_budget_min || 0} - ৳{req.salary_budget_max || 0} • Created: {new Date(req.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl">
                  {isBn ? 'কোনো টিউশন রিকুয়েস্ট পাওয়া যায়নি।' : 'No tuition requests on record.'}
                </div>
              )}
            </div>

            {/* Bookings Section */}
            <div className="bg-card/60 rounded-2xl p-6 space-y-4">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{isBn ? 'কনফার্মড বুকিং ও ক্লাস' : 'Confirmed Bookings'}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isBn ? 'শিক্ষকদের সাথে সক্রিয় ও সম্পন্ন টিউশন বুকিং' : 'Engagements contracted with tutors.'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {bookings.length} {isBn ? 'টি' : 'Bookings'}
                </Badge>
              </div>

              {bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground font-mono">{b.booking_reference || b.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {b.status?.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {b.mode?.toUpperCase() || 'ONLINE'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          Tutor: {b.tutor_name || 'Assigned Tutor'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Price: ৳{b.price_per_session_minor ? Math.round(b.price_per_session_minor / 100) : 0}/session • Booked: {new Date(b.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl">
                  {isBn ? 'কোনো সক্রিয় বুকিং পাওয়া যায়নি।' : 'No confirmed bookings on record.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Step Timeline Audit Logs (Diff-Only) */}
        {activeTab === 'audit' && (
          <div className="bg-card/60 rounded-2xl p-6 space-y-6">
            <div className="border-b border-border/40 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span>{isBn ? 'অ্যাকাউন্ট অডিট হিস্ট্রি টাইমলাইন' : 'Audit Change Timeline (Diff-Only)'}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isBn
                    ? 'প্রশাসনিক পরিবর্তন ও আগের/পরের মানের দৃশ্যমান টাইমলাইন (শুধুমাত্র পরিবর্তিত তথ্য)'
                    : 'Attributed change events displaying administrative modifications with before and after diffs.'}
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
                  const diffs = computeStudentDiffs(metadata.before, metadata.after);
                  const actor = log.actor_name || metadata.updatedBy || 'Administrator';

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
                {isBn ? 'এই অ্যাকাউন্টের জন্য কোনো পূর্ববর্তী অডিট রেকর্ড নেই।' : 'No recorded audit log events for this user.'}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
