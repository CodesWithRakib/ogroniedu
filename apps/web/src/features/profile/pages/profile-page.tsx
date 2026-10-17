'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  LoadingSpinner,
  Badge,
} from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  Calendar,
  Lock,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  School,
  Globe,
  KeyRound,
  Info,
} from 'lucide-react';
import { type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/slices/auth-slice';
import { useLogoutMutation, useRevokeAllSessionsMutation } from '@/store/services/auth-api';
import {
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
} from '@/store/services/taxonomy-api';
import { useProfileForm } from '../hooks/use-profile-form';

/**
 * Session security: revoke-all signs out every device server-side, then
 * clears the local session immediately and lands on login with a confirmation notice.
 */
function SessionSecurityCard({ locale }: { locale: Locale }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [revokeAll, { isLoading }] = useRevokeAllSessionsMutation();
  const [logoutApi] = useLogoutMutation();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isBn = locale === 'bn';

  async function handleRevokeAll() {
    setError(null);
    try {
      await revokeAll().unwrap();
      try {
        await logoutApi({}).unwrap();
      } catch {
        // Server logout best-effort
      }
      try {
        sessionStorage.setItem('ogroniedu.signedOut', 'all');
      } catch {
        // Private mode fallback
      }
      dispatch(logout());
      router.replace(withLocale('/login', locale));
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border bg-card shadow-xs">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          {isBn ? 'সেশন ও ডিভাইস নিরাপত্তা' : 'Sessions & Security'}
        </CardTitle>
        <CardDescription className="text-xs">
          {isBn
            ? 'অন্য সব ডিভাইস ও ব্রাউজার থেকে সাইন-আউট করে সক্রিয় অ্যাক্সেস প্রত্যাহার করুন।'
            : 'Sign out of all other browsers and devices to secure your account.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-surface-muted border border-border/80 text-xs text-muted-foreground flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-success-soft-foreground shrink-0 mt-0.5" />
          <span>
            {isBn
              ? 'আপনার অ্যাকাউন্ট টোকেন ভার্সনিং এবং জেসিডব্লিউটি (JWT) সুরক্ষার মাধ্যমে পরিচালিত হচ্ছে। সন্দেহজনক কোনো কার্যকলাপ মনে হলে অবিলম্বে সব সেশন বাতিল করুন।'
              : 'Your session is protected with token versioning and JWT. If you suspect unauthorized access, revoke all active sessions immediately.'}
          </span>
        </div>

        {error && (
          <Alert variant="destructive" data-testid="revoke-all-error">
            <AlertDescription role="alert">{error}</AlertDescription>
          </Alert>
        )}

        {!confirming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            data-testid="revoke-all-btn"
            className="rounded-full px-5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {isBn ? 'সব ডিভাইস থেকে সাইন-আউট' : 'Sign out all devices'}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-destructive-soft border border-destructive/30">
            <Button
              variant="destructive"
              size="sm"
              isLoading={isLoading}
              onClick={handleRevokeAll}
              data-testid="revoke-all-confirm-btn"
              className="rounded-full px-5 font-semibold"
            >
              {isBn ? 'নিশ্চিত করুন — সব সেশন বাতিল' : 'Confirm — revoke all'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              className="rounded-full px-4"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Autonomy and Capabilities Matrix Component
 * Explains clearly what a Minor Child vs Standalone Student vs Guardian can do
 */
function AutonomyMatrixCard({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          {isBn ? 'প্ল্যাটফর্ম সক্ষমতা ও অধিকার ম্যাট্রিক্স' : 'Platform Capabilities & Rights Matrix'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isBn
            ? 'অগ্রণী এডু প্ল্যাটফর্মে অপ্রাপ্তবয়স্ক শিক্ষার্থী, স্বতন্ত্র প্রাপ্তবয়স্ক শিক্ষার্থী এবং অভিভাবকের ভূমিকা ও দায়িত্বের সুস্পষ্ট বিবরণ।'
            : 'Clear breakdown of responsibilities and capabilities across Minor Learners, Independent Students, and Guardians.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Minor Child Learner */}
        <Card className="rounded-3xl border-border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isBn ? 'অপ্রাপ্তবয়স্ক শিক্ষার্থী' : 'Protected Minor Learner'}
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {isBn ? 'বয়স ১৮ বছরের নিচে' : 'Age < 18 years'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-primary">
                {isBn ? 'সরাসরি যা যা করতে পারবে:' : 'Autonomous Actions:'}
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'ডিজিটাল ক্লাসরুমে প্রবেশ ও লাইভ ক্লাসে অংশ নেওয়া' : 'Join live video classrooms & study sessions'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'হোমওয়ার্ক, অ্যাসাইনমেন্ট ও কুইজ জমা দেওয়া' : 'Submit assignments, homework & take quizzes'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'নিজস্ব ক্লাসের রুটিন, উপস্থিতি ও পড়ার প্রগ্রেস দেখা' : 'View session schedules, attendance & analytics'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'শিক্ষকের সাথে ক্লাসরুমে সরাসরি মেসেজিং' : 'Communicate with assigned tutor in classroom chat'}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-border/80">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-amber-600">
                {isBn ? 'অভিভাবকের সুরক্ষা ও নিয়ন্ত্রণ:' : 'Guardian Supervision:'}
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'সরাসরি আর্থিক লেনদেন ও পেমেন্ট নিষিদ্ধ' : 'Direct financial payment execution restricted'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'টিউটর হায়ার ও বুকিং চুক্তি অভিভাবকের অনুমোদনসাপেক্ষ' : 'Tutor hiring & booking requires guardian approval'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'জরুরি এসওএস সেফটি রিপোর্ট স্বয়ংক্রিয়ভাবে অভিভাবককে পাঠায়' : 'Safety SOS alerts directly escalate to linked guardian'}</span>
                </li>
              </ul>
            </div>
          </div>

          <Badge variant="outline" className="w-full justify-center py-1 bg-amber-500/10 text-amber-700 border-amber-500/30 text-[11px]">
            {isBn ? '🛡️ অভিভাবক সুরক্ষায় পরিচালিত' : '🛡️ Guardian Protected'}
          </Badge>
        </Card>

        {/* Card 2: Standalone Student */}
        <Card className="rounded-3xl border-border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isBn ? 'স্বতন্ত্র প্রাপ্তবয়স্ক শিক্ষার্থী' : 'Independent Adult Learner'}
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {isBn ? 'বয়স ১৮ বছর বা তদূর্ধ্ব' : 'Age >= 18 years'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-primary">
                {isBn ? 'সম্পূর্ণ স্বাধীন সক্ষমতা:' : 'Full Autonomous Powers:'}
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'স্বাধীনভাবে টিউটরদের প্রোফাইল, ফি ও রিভিউ দেখা' : 'Explore verified tutor profiles, ratings & credentials'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'সরাসরি টিউটরকে বুকিং ও ইন্টারভিউ অফার পাঠানো' : 'Send booking requests & interview requests directly'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'বিকাশ, নগদ ও কার্ড দিয়ে সরাসরি ফি পরিশোধ' : 'Direct tuition payment via bKash, Nagad & Cards'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'ক্লাস রিশিডিউল ও ক্যান্সেলেশন পরিচালনা' : 'Manage session rescheduling and cancellations'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>{isBn ? 'টিউটরদের রেটিং ও পাবলিক রিভিউ প্রদান' : 'Submit tutor ratings and verified public reviews'}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-border/80">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-primary">
                {isBn ? 'ঐচ্ছিক সুবিধা:' : 'Optional Features:'}
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{isBn ? 'অভিভাবক বা স্পন্সরকে একাডেমিক পর্যবেক্ষক হিসেবে লিঙ্ক করা' : 'Optionally link a guardian/sponsor as academic viewer'}</span>
                </li>
              </ul>
            </div>
          </div>

          <Badge variant="outline" className="w-full justify-center py-1 bg-primary/10 text-primary border-primary/30 text-[11px]">
            {isBn ? '🎓 সম্পূর্ণ স্বাধীন শিক্ষার্থী' : '🎓 Full Autonomy'}
          </Badge>
        </Card>

        {/* Card 3: Guardian */}
        <Card className="rounded-3xl border-border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isBn ? 'অভিভাবক একাউন্ট' : 'Family Guardian'}
                </h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {isBn ? 'পিতা-মাতা / আইনগত অভিভাবক' : 'Parent / Legal Guardian'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-emerald-600">
                {isBn ? 'তদারকি ও প্রশাসনিক অধিকার:' : 'Oversight & Administrative:'}
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isBn ? 'একাধিক সন্তানের বিস্তারিত প্রোফাইল নিবন্ধন ও তদারকি' : 'Register and manage multiple children profiles'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isBn ? 'সন্তানদের জন্য যাচাইকৃত শিক্ষক নির্বাচন ও বুকিং' : 'Hire and contract verified tutors for children'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isBn ? 'এসক্রো সিস্টেমে সুরক্ষিত ফি পরিশোধ ও অর্থ ছাড়' : 'Secure escrow payments and milestone releases'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isBn ? 'সন্তানের প্রতিদিনের ক্লাসের উপস্থিতি ও রিপোর্ট দেখা' : 'Track daily session attendance, grades & progress'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{isBn ? '৪৮ ঘণ্টার মধ্যে ফ্রি শিক্ষক প্রতিস্থাপনের গ্যারান্টি দাবি' : 'Claim 48-hour tutor replacement guarantee'}</span>
                </li>
              </ul>
            </div>
          </div>

          <Badge variant="outline" className="w-full justify-center py-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[11px]">
            {isBn ? '👨‍👩‍👧 অভিভাবক ও এসক্রো নিয়ন্ত্রক' : '👨‍👩‍👧 Family Guardian'}
          </Badge>
        </Card>
      </div>
    </div>
  );
}

/**
 * Profile entry: multi-tab role-aware profile center with personal and academic editing.
 */
export function ProfilePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'matrix' | 'security'>('personal');

  const profile = useProfileForm(locale);

  // Taxonomy for education level and curriculum
  const { data: levelsEnvelope } = useGetEducationLevelsQuery();
  const { data: curriculaEnvelope } = useGetCurriculaQuery();

  const educationLevels = React.useMemo(() => {
    return levelsEnvelope?.data || [];
  }, [levelsEnvelope]);

  const curricula = React.useMemo(() => {
    return curriculaEnvelope?.data || [];
  }, [curriculaEnvelope]);

  const user = profile.data;
  const isStudent = user?.roles?.includes('student');
  const isGuardian = user?.roles?.includes('guardian');
  const isTutor = user?.roles?.includes('tutor');
  const isMinor = Boolean(user?.isMinor);

  const initials = (user?.displayName || 'OG')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'ব্যবহারকারী প্রোফাইল ও সেটিংস' : 'User Profile & Settings'}
      subtitle={
        isBn
          ? 'ব্যক্তিগত তথ্য, একাডেমিক লক্ষ্য, শিক্ষার্থী স্বায়ত্তশাসন এবং নিরাপত্তা নিয়ন্ত্রণ'
          : 'Personal details, academic goals, learner autonomy, and security settings'
      }
    >
      {profile.isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">
            {isBn ? 'প্রোফাইল লোড হচ্ছে...' : 'Loading user profile...'}
          </p>
        </div>
      ) : profile.queryError ? (
        <Card className="rounded-3xl border-destructive/30 bg-destructive-soft">
          <CardContent className="py-8 text-center text-sm text-destructive font-medium">
            {profile.queryError}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Identity Hero Card */}
          <Card className="rounded-3xl border-border bg-gradient-to-br from-card via-card to-surface-muted p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 text-primary font-black text-xl flex items-center justify-center shrink-0 shadow-inner">
                  {initials}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {user?.displayName || 'User'}
                    </h2>
                    {/* Role badges */}
                    {user?.roles?.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="text-[11px] font-semibold capitalize px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
                      >
                        {role === 'student'
                          ? isBn ? 'শিক্ষার্থী' : 'Student'
                          : role === 'guardian'
                            ? isBn ? 'অভিভাবক' : 'Guardian'
                            : role === 'tutor'
                              ? isBn ? 'শিক্ষক' : 'Tutor'
                              : role}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {user?.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-foreground">{user.email}</span>
                      </span>
                    )}
                    {user?.phoneE164 && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-foreground">{user.phoneE164}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Learner Autonomy Status Pill */}
              <div className="shrink-0 w-full sm:w-auto">
                {isStudent ? (
                  isMinor ? (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-700 block">
                          {isBn ? '🛡️ অপ্রাপ্তবয়স্ক শিক্ষার্থী (Minor Learner)' : '🛡️ Protected Minor Learner'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {isBn ? 'অভিভাবক সুরক্ষা ও এসক্রো দ্বারা নিয়ন্ত্রিত' : 'Supervised via Guardian Escrow'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-2.5">
                      <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-primary block">
                          {isBn ? '🎓 স্বতন্ত্র শিক্ষার্থী (Independent Learner)' : '🎓 Independent Adult Learner'}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {isBn ? 'সরাসরি বুকিং ও নিজস্ব পেমেন্ট ক্ষমতা' : 'Direct Booking & Autonomous Payments'}
                        </span>
                      </div>
                    </div>
                  )
                ) : isGuardian ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-700 block">
                        {isBn ? '👨‍👩‍👧 অভিভাবক একাউন্ট' : '👨‍👩‍👧 Family Guardian'}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {isBn ? 'সন্তানের একাডেমিক তদারকি ও এসক্রো সুরক্ষা' : 'Academic Oversight & Escrow Manager'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-2.5">
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-primary block">
                        {isBn ? '👨‍🏫 যাচাইকৃত শিক্ষক' : '👨‍🏫 Verified Educator'}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {isBn ? 'সেশন ও পাঠদান ব্যবস্থাপনা' : 'Classroom & Earnings Manager'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Tab Navigation Controls */}
          <div className="flex flex-wrap p-1 bg-surface-muted rounded-2xl border border-border/80 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex-1 min-w-[140px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'personal'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Details'}</span>
            </button>

            {isStudent && (
              <button
                type="button"
                onClick={() => setActiveTab('academic')}
                className={`flex-1 min-w-[140px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'academic'
                    ? 'bg-card text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <School className="h-3.5 w-3.5 text-primary" />
                <span>{isBn ? 'একাডেমিক প্রোফাইল' : 'Academic Profile'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex-1 min-w-[140px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'matrix'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'অধিকার ও সক্ষমতা' : 'Rights & Autonomy'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 min-w-[140px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'সেশন ও নিরাপত্তা' : 'Security & Sessions'}</span>
            </button>
          </div>

          {/* TAB 1: Personal Details */}
          {activeTab === 'personal' && (
            <Card className="rounded-3xl border-border bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {isBn ? 'ব্যক্তিগত বিবরণ ও পছন্দসমূহ' : 'Personal Details & Preferences'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'আপনার নাম এবং ব্যবহারের ভাষা আপডেট করুন।'
                    : 'Update your display name and preferred interface language.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={profile.handleSave}
                  className="space-y-4"
                  data-testid="profile-form"
                >
                  {profile.formError && (
                    <Alert variant="destructive">
                      <AlertDescription role="alert">{profile.formError}</AlertDescription>
                    </Alert>
                  )}
                  {profile.saved && (
                    <div className="p-3 rounded-2xl bg-success-soft border border-success/30 flex items-center gap-2 text-xs text-success-soft-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span>{profile.saved}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="profile-name" className="text-xs font-semibold text-foreground">
                        {isBn ? 'পুরো নাম' : 'Full name'}
                      </Label>
                      <Input
                        id="profile-name"
                        value={profile.displayName}
                        onChange={(e) => profile.setDisplayName(e.target.value)}
                        data-testid="profile-name-input"
                        placeholder={isBn ? 'আপনার পূর্ণ নাম' : 'Your full name'}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email" className="text-xs font-semibold text-foreground">
                        {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
                      </Label>
                      <Input
                        id="profile-email"
                        value={user?.email || ''}
                        disabled
                        className="bg-surface-muted cursor-not-allowed font-mono text-xs"
                      />
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        {isBn ? 'যাচাইকৃত প্রাইমারি ইমেইল' : 'Verified primary email'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-phone" className="text-xs font-semibold text-foreground">
                        {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
                      </Label>
                      <Input
                        id="profile-phone"
                        value={user?.phoneE164 || ''}
                        disabled
                        className="bg-surface-muted cursor-not-allowed font-mono text-xs"
                      />
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        {isBn ? 'যাচাইকৃত মোবাইল' : 'Verified mobile number'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-locale" className="text-xs font-semibold text-foreground">
                        {isBn ? 'পছন্দের ভাষা' : 'Preferred Language'}
                      </Label>
                      <Select
                        value={profile.preferredLocale}
                        onValueChange={(val) => profile.setPreferredLocale(val as 'bn' | 'en')}
                      >
                        <SelectTrigger id="profile-locale" className="rounded-2xl bg-card border-border text-sm">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        {isBn ? 'নিবন্ধনের তারিখ' : 'Member Since'}
                      </Label>
                      <div className="h-10 px-3 rounded-2xl bg-surface-muted border border-border flex items-center text-xs font-mono text-muted-foreground">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      isLoading={profile.saving}
                      data-testid="profile-save-btn"
                      className="rounded-full px-6 shadow-xs font-semibold"
                    >
                      {isBn ? 'ব্যক্তিগত তথ্য সংরক্ষণ করুন' : 'Save Personal Details'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Academic Profile (For Students) */}
          {activeTab === 'academic' && isStudent && (
            <Card className="rounded-3xl border-border bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="h-4 w-4 text-primary" />
                  {isBn ? 'শিক্ষার্থী একাডেমিক প্রোফাইল ও লক্ষ্য' : 'Student Academic Profile & Goals'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn
                    ? 'আপনার জন্ম তারিখ, শিক্ষা প্রতিষ্ঠান, শ্রেণি, কারিকুলাম ও পড়ার লক্ষ্য আপডেট করুন।'
                    : 'Manage your date of birth, school, grade, curriculum and personal learning objectives.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profile.handleSaveAcademicProfile} className="space-y-4">
                  {profile.academicError && (
                    <Alert variant="destructive">
                      <AlertDescription role="alert">{profile.academicError}</AlertDescription>
                    </Alert>
                  )}
                  {profile.academicSaved && (
                    <div className="p-3 rounded-2xl bg-success-soft border border-success/30 flex items-center gap-2 text-xs text-success-soft-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span>{profile.academicSaved}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="academic-dob" className="text-xs font-semibold text-foreground">
                        {isBn ? 'জন্ম তারিখ (বয়স ও স্বায়ত্তশাসন নির্ধারণ)' : 'Date of Birth'}
                      </Label>
                      <Input
                        id="academic-dob"
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => profile.setDateOfBirth(e.target.value)}
                      />
                      <span className="text-[11px] text-muted-foreground block">
                        {isBn
                          ? '১৮ বছরের কম বয়স হলে একাউন্টটি অভিভাবক সুরক্ষিত হিসেবে গণ্য হয়।'
                          : 'Students under 18 operate in guardian-supervised safe mode.'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="academic-institution" className="text-xs font-semibold text-foreground">
                        {isBn ? 'শিক্ষা প্রতিষ্ঠান / স্কুলের নাম' : 'Institution / College Name'}
                      </Label>
                      <Input
                        id="academic-institution"
                        value={profile.institutionName}
                        onChange={(e) => profile.setInstitutionName(e.target.value)}
                        placeholder={isBn ? 'যেমন: ঢাকা কলেজ, ভিকারুননিসা নূন' : 'e.g. Dhaka College'}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="academic-level" className="text-xs font-semibold text-foreground">
                        {isBn ? 'শ্রেণি / গ্রেড' : 'Education Level'}
                      </Label>
                      <Select
                        value={profile.educationLevelId}
                        onValueChange={(val) => profile.setEducationLevelId(val)}
                      >
                        <SelectTrigger id="academic-level" className="rounded-2xl bg-card border-border text-sm">
                          <SelectValue placeholder={isBn ? 'শ্রেণি নির্বাচন করুন' : 'Select Grade'} />
                        </SelectTrigger>
                        <SelectContent>
                          {educationLevels.map((lvl) => (
                            <SelectItem key={lvl.id} value={lvl.id}>
                              {isBn ? lvl.nameBn : lvl.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="academic-curriculum" className="text-xs font-semibold text-foreground">
                        {isBn ? 'কারিকুলাম / মাধ্যম' : 'Curriculum'}
                      </Label>
                      <Select
                        value={profile.curriculumId}
                        onValueChange={(val) => profile.setCurriculumId(val)}
                      >
                        <SelectTrigger id="academic-curriculum" className="rounded-2xl bg-card border-border text-sm">
                          <SelectValue placeholder={isBn ? 'কারিকুলাম নির্বাচন করুন' : 'Select Curriculum'} />
                        </SelectTrigger>
                        <SelectContent>
                          {curricula.map((curr) => (
                            <SelectItem key={curr.id} value={curr.id}>
                              {isBn ? curr.nameBn : curr.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="academic-stream" className="text-xs font-semibold text-foreground">
                        {isBn ? 'বিভাগ / শাখা' : 'Stream / Group'}
                      </Label>
                      <Input
                        id="academic-stream"
                        value={profile.stream}
                        onChange={(e) => profile.setStream(e.target.value)}
                        placeholder={isBn ? 'যেমন: বিজ্ঞান, ব্যবসায় শিক্ষা, মানবিক' : 'e.g. Science, Commerce, Arts'}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="academic-goals" className="text-xs font-semibold text-foreground">
                        {isBn ? 'শেখার লক্ষ্য ও বিশেষ দুর্বল বিষয়সমূহ' : 'Learning Goals & Weak Areas'}
                      </Label>
                      <textarea
                        id="academic-goals"
                        value={profile.learningGoals}
                        onChange={(e) => profile.setLearningGoals(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-input bg-background p-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder={
                          isBn
                            ? 'যেমন: পদার্থবিজ্ঞান ও উচ্চতর গণিতে দুর্বলতা কাটিয়ে এ+ নিশ্চিত করা এবং নিয়মিত প্র্যাকটিস করা...'
                            : 'e.g. Need intensive practice in Physics & Higher Math to ace upcoming board exams...'
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="academic-visibility" className="text-xs font-semibold text-foreground">
                        {isBn ? 'প্রোফাইলের দৃশ্যমানতা' : 'Profile Visibility'}
                      </Label>
                      <Select
                        value={profile.profileVisibility}
                        onValueChange={(val) => profile.setProfileVisibility(val as 'private' | 'limited')}
                      >
                        <SelectTrigger id="academic-visibility" className="rounded-2xl bg-card border-border text-sm">
                          <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">{isBn ? 'ব্যক্তিগত (Private)' : 'Private'}</SelectItem>
                          <SelectItem value="limited">{isBn ? 'শুধুমাত্র শিক্ষকদের জন্য (Limited to Tutors)' : 'Limited to Tutors'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      isLoading={profile.academicSaving}
                      className="rounded-full px-6 shadow-xs font-semibold"
                    >
                      {isBn ? 'একাডেমিক তথ্য সংরক্ষণ করুন' : 'Save Academic Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Rights & Autonomy Matrix */}
          {activeTab === 'matrix' && (
            <AutonomyMatrixCard locale={locale} />
          )}

          {/* TAB 4: Sessions & Security */}
          {activeTab === 'security' && (
            <SessionSecurityCard locale={locale} />
          )}
        </div>
      )}
    </DashboardShell>
  );
}
