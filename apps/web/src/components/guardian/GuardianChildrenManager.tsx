'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Trash2,
  Lock,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatusBadge,
  Input,
} from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { useGuardianChildren } from './use-guardian-children';

export type GuardianRelationship = 'father' | 'mother' | 'legal_guardian';

/** Narrow the raw select value into the relationship union without asserting `any`. */
export function toGuardianRelationship(value: string): GuardianRelationship {
  return value === 'mother' || value === 'legal_guardian' ? value : 'father';
}

export interface ChildItem {
  linkId: string;
  studentId: string;
  displayName: string;
  relationshipType: 'father' | 'mother' | 'legal_guardian' | string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: string | null;
  isMinor: boolean;
  institutionName?: string | null;
  educationLevelName?: string | null;
  curriculumName?: string | null;
  stream?: string | null;
  learningGoals?: string | null;
}

export interface GuardianChildrenCallbacks {
  onAddChild?: (data: {
    studentIdentifier: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRegisterChild?: (data: {
    displayName: string;
    dateOfBirth?: string;
    gender?: string;
    institutionName?: string;
    educationLevelId?: string;
    curriculumId?: string;
    stream?: string;
    learningGoals?: string;
    email?: string;
    phone?: string;
    relationshipType: string;
    consentPolicyVersion: string;
    consentAgreed: boolean;
  }) => Promise<void>;
  onRevokeLink?: (studentId: string) => Promise<void>;
}

export interface TaxonomyOption {
  id: string;
  nameEn: string;
  nameBn: string;
}

const DEFAULT_EDUCATION_LEVELS: TaxonomyOption[] = [
  { id: 'lvl-class-1', nameEn: 'Class 1', nameBn: '১ম শ্রেণি' },
  { id: 'lvl-class-5', nameEn: 'Class 5 (Primary)', nameBn: '৫ম শ্রেণি (প্রাথমিক)' },
  { id: 'lvl-class-8', nameEn: 'Class 8 (JSC)', nameBn: '৮ম শ্রেণি (জেএসসি)' },
  { id: 'lvl-class-9', nameEn: 'Class 9', nameBn: '৯ম শ্রেণি' },
  { id: 'lvl-class-10', nameEn: 'Class 10 (SSC)', nameBn: '১০ম শ্রেণি (এসএসসি)' },
  { id: 'lvl-class-11', nameEn: 'Class 11 (HSC 1st Year)', nameBn: 'একাদশ শ্রেণি (এইচএসসি)' },
  { id: 'lvl-class-12', nameEn: 'Class 12 (HSC 2nd Year)', nameBn: 'দ্বাদশ শ্রেণি (এইচএসসি)' },
  { id: 'lvl-olevel', nameEn: 'O-Level (Cambridge/Edexcel)', nameBn: 'ও-লেভেল (ইংরেজি মাধ্যম)' },
  { id: 'lvl-alevel', nameEn: 'A-Level (Cambridge/Edexcel)', nameBn: 'এ-লেভেল (ইংরেজি মাধ্যম)' },
];

const DEFAULT_CURRICULA: TaxonomyOption[] = [
  {
    id: 'curr-nctb-bn',
    nameEn: 'NCTB (Bengali Medium)',
    nameBn: 'জাতীয় শিক্ষাক্রম (বাংলা ভার্সন)',
  },
  {
    id: 'curr-nctb-en',
    nameEn: 'NCTB (English Version)',
    nameBn: 'জাতীয় শিক্ষাক্রম (ইংলিশ ভার্সন)',
  },
  { id: 'curr-cambridge', nameEn: 'Cambridge International', nameBn: 'ক্যামব্রিজ কারিকুলাম' },
  { id: 'curr-edexcel', nameEn: 'Edexcel Pearson', nameBn: 'এডেক্সেল কারিকুলাম' },
  { id: 'curr-madrasah', nameEn: 'Madrasah Education Board', nameBn: 'মাদ্রাসা শিক্ষাক্রম' },
];

const DEFAULT_STREAMS: TaxonomyOption[] = [
  { id: 'stream-science', nameEn: 'Science', nameBn: 'বিজ্ঞান' },
  { id: 'stream-commerce', nameEn: 'Business Studies / Commerce', nameBn: 'ব্যবসায় শিক্ষা' },
  { id: 'stream-humanities', nameEn: 'Humanities / Arts', nameBn: 'মানবিক' },
  { id: 'stream-general', nameEn: 'General', nameBn: 'সাধারণ' },
  { id: 'stream-vocational', nameEn: 'Vocational / Technical', nameBn: 'কারিগরি ও ভোকেশনাল' },
  { id: 'stream-islamic', nameEn: 'Islamic Studies / General Madrasah', nameBn: 'ইসলামিক স্টাডিজ' },
];

const DEFAULT_INSTITUTIONS: TaxonomyOption[] = [
  { id: 'inst-notre-dame', nameEn: 'Notre Dame College, Dhaka', nameBn: 'নটর ডেম কলেজ, ঢাকা' },
  {
    id: 'inst-viqarunnisa',
    nameEn: 'Viqarunnisa Noon School and College',
    nameBn: 'ভিকারুননিসা নূন স্কুল অ্যান্ড কলেজ',
  },
  { id: 'inst-rajuk', nameEn: 'Rajuk Uttara Model College', nameBn: 'রাজউক উত্তরা মডেল কলেজ' },
  {
    id: 'inst-drmc',
    nameEn: 'Dhaka Residential Model College',
    nameBn: 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ',
  },
  { id: 'inst-holy-cross', nameEn: 'Holy Cross College, Dhaka', nameBn: 'হলি ক্রস কলেজ, ঢাকা' },
  {
    id: 'inst-st-joseph',
    nameEn: 'St. Joseph Higher Secondary School',
    nameBn: 'সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়',
  },
  {
    id: 'inst-ideal',
    nameEn: 'Ideal School and College, Motijheel',
    nameBn: 'আইডিয়াল স্কুল অ্যান্ড কলেজ, মতিঝিল',
  },
  { id: 'inst-dhaka-college', nameEn: 'Dhaka College', nameBn: 'ঢাকা কলেজ' },
  { id: 'inst-adamjee', nameEn: 'Adamjee Cantonment College', nameBn: 'আদমজী ক্যান্টনমেন্ট কলেজ' },
  { id: 'inst-city-college', nameEn: 'Dhaka City College', nameBn: 'ঢাকা সিটি কলেজ' },
  {
    id: 'inst-govt-lab',
    nameEn: 'Government Laboratory High School',
    nameBn: 'গভর্নমেন্ট ল্যাবরেটরি হাই স্কুল',
  },
  { id: 'inst-chittagong-college', nameEn: 'Chittagong College', nameBn: 'চট্টগ্রাম কলেজ' },
  { id: 'inst-rajshahi-college', nameEn: 'Rajshahi College', nameBn: 'রাজশাহী কলেজ' },
  { id: 'inst-milestone', nameEn: 'Milestone College, Uttara', nameBn: 'মাইলস্টোন কলেজ, উত্তরা' },
  { id: 'inst-baf-shaheen', nameEn: 'BAF Shaheen College Dhaka', nameBn: 'বিএএফ শাহীন কলেজ ঢাকা' },
  {
    id: 'inst-sylhet-mc',
    nameEn: 'Murari Chand (MC) College, Sylhet',
    nameBn: 'মুরারিচাঁদ (এমসি) কলেজ, সিলেট',
  },
  {
    id: 'inst-barishal-bm',
    nameEn: 'Govt. Brajamohan (BM) College, Barishal',
    nameBn: 'সরকারি ব্রজমোহন (বিএম) কলেজ, বরিশাল',
  },
  { id: 'inst-du', nameEn: 'University of Dhaka', nameBn: 'ঢাকা বিশ্ববিদ্যালয়' },
  {
    id: 'inst-buet',
    nameEn: 'Bangladesh University of Engineering and Technology (BUET)',
    nameBn: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট)',
  },
  { id: 'inst-dmc', nameEn: 'Dhaka Medical College', nameBn: 'ঢাকা মেডিকেল কলেজ' },
];

interface GuardianChildrenManagerProps extends GuardianChildrenCallbacks {
  locale: Locale;
  initialChildren?: ChildItem[];
  educationLevels?: TaxonomyOption[];
  curricula?: TaxonomyOption[];
  streams?: TaxonomyOption[];
  institutions?: TaxonomyOption[];
}

const EMPTY_CHILDREN: ChildItem[] = [];

export function GuardianChildrenManager({
  locale,
  initialChildren = EMPTY_CHILDREN,
  educationLevels = DEFAULT_EDUCATION_LEVELS,
  curricula = DEFAULT_CURRICULA,
  streams = DEFAULT_STREAMS,
  institutions = DEFAULT_INSTITUTIONS,
  onAddChild,
  onRegisterChild,
  onRevokeLink,
}: GuardianChildrenManagerProps) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';

  const {
    children,
    isModalOpen,
    setIsModalOpen,
    activeTab,
    setActiveTab,
    regName,
    setRegName,
    regDob,
    setRegDob,
    regGender,
    setRegGender,
    regInstitution,
    setRegInstitution,
    regEducationLevelId,
    setRegEducationLevelId,
    regCurriculumId,
    setRegCurriculumId,
    regStream,
    setRegStream,
    regLearningGoals,
    setRegLearningGoals,
    regPhone,
    setRegPhone,
    regEmail,
    setRegEmail,
    identifier,
    setIdentifier,
    relationship,
    setRelationship,
    consentAgreed,
    setConsentAgreed,
    loading,
    errorMessage,
    handleLinkChild,
    handleRegisterChild,
    handleRevoke,
    closeModal,
  } = useGuardianChildren(locale, initialChildren, {
    onAddChild,
    onRegisterChild,
    onRevokeLink,
  });

  const [customInstitution, setCustomInstitution] = React.useState(false);
  const [customStream, setCustomStream] = React.useState(false);

  return (
    <div className="space-y-6" data-testid="guardian-children-manager">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {dict.guardian.childrenTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{dict.guardian.childrenSubtitle}</p>
        </div>
        <Button
          onClick={() => {
            setActiveTab('register');
            setIsModalOpen(true);
          }}
          className="gap-2 shrink-0 rounded-full shadow-xs px-5 font-semibold"
          id="btn-add-child"
        >
          <UserPlus className="h-4 w-4" />
          {dict.guardian.addChild}
        </Button>
      </div>

      {/* Minor Protection & Autonomy Info Banner */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>
                {isBn
                  ? 'অভিভাবক সুরক্ষা ও শিক্ষার্থী সক্ষমতা নীতি'
                  : 'Minor Student Protection & Guardian Escrow'}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/10 text-primary border-primary/30"
              >
                BD Minor Safe
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {isBn
                ? 'অপ্রাপ্তবয়স্ক শিক্ষার্থীদের নিজস্ব অ্যাকাউন্টে সরাসরি পেমেন্ট নিষিদ্ধ রাখা হয়েছে। টিউশন ফি পরিশোধ, এসক্রো নিরাপত্তা ও শিক্ষক নিয়োগ অভিভাবক হিসেবে আপনার নিয়ন্ত্রণে থাকবে। শিক্ষার্থীরা সরাসরি ডিজিটাল ক্লাসরুমে অংশ নিতে, হোমওয়ার্ক জমা দিতে ও প্রগ্রেস রিপোর্ট দেখতে পারবে।'
                : 'Direct financial payments are restricted on minor student accounts. Tuition fee payments, escrow releases and tutor hiring remain under your guardian oversight. Students can freely join live classrooms, submit homework, and view study schedules.'}
            </p>
          </div>
        </div>
        <Link
          href={withLocale('/profile', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 shrink-0 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <span>{isBn ? 'অধিকার ম্যাট্রিক্স দেখুন' : 'View Rights Matrix'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Children List */}
      {children.length === 0 ? (
        <Card className="text-center py-16 rounded-3xl border-dashed border-2 border-border/80 bg-card/60">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'এখনো কোনো সন্তান যুক্ত করা হয়নি' : 'No children profiles linked yet'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'নতুন সন্তান প্রোফাইল নিবন্ধন করুন (শ্রেণি, কারিকুলাম, স্কুল ও লক্ষ্য সহ) অথবা শিক্ষার্থীর ফোন বা ইমেইল দিয়ে বিদ্যমান অ্যাকাউন্ট লিঙ্ক করুন।'
                  : 'Register a detailed child profile (with class, curriculum, school & learning goals) or link an existing student account.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => {
                  setActiveTab('register');
                  setIsModalOpen(true);
                }}
                className="rounded-full px-6 gap-2 shadow-xs font-semibold"
              >
                <UserPlus className="h-4 w-4" />
                {isBn ? 'নতুন সন্তান নিবন্ধন করুন' : 'Register New Child'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('link');
                  setIsModalOpen(true);
                }}
                className="rounded-full px-5 gap-2 font-medium"
              >
                <LinkIcon className="h-4 w-4" />
                {isBn ? 'বিদ্যমান অ্যাকাউন্ট লিঙ্ক' : 'Link Existing Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => {
            const initials = child.displayName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <Card
                key={child.linkId}
                className="rounded-3xl border-border bg-card hover:border-primary/40 hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-black text-sm flex items-center justify-center shrink-0 shadow-inner">
                        {initials || 'ST'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base font-bold text-foreground">
                            {child.displayName}
                          </CardTitle>
                          {child.isMinor && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border-warning/30 font-medium"
                            >
                              {isBn ? 'সুরক্ষিত অপ্রাপ্তবয়স্ক (Minor)' : 'Protected Minor (<18)'}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                          <span>
                            {child.institutionName ||
                              (isBn ? 'সাধারণ শিক্ষা প্রতিষ্ঠান' : 'Institution')}
                          </span>
                          <span>•</span>
                          <span>
                            {child.educationLevelName || (isBn ? 'শ্রেণি স্তর' : 'Grade Level')}
                          </span>
                          {child.stream && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">{child.stream}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={child.status}>
                      {child.status === 'active'
                        ? dict.guardian.activeBadge
                        : dict.guardian.pendingBadge}
                    </StatusBadge>
                  </div>

                  {child.learningGoals && (
                    <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        <strong className="text-foreground">
                          {isBn ? 'শেখার লক্ষ্য: ' : 'Goal: '}
                        </strong>
                        {child.learningGoals}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/80 pt-3">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-success-soft-foreground" />
                      {isBn ? 'সম্পর্ক:' : 'Relation:'}{' '}
                      <strong className="text-foreground capitalize">
                        {child.relationshipType}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-surface-muted px-2 py-0.5 rounded-lg border border-border/60">
                      <Lock className="h-3 w-3" />
                      {child.consentPolicyVersion || 'v1.0-bd-minor-consent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                  <Link
                    href={withLocale(`/dashboard/guardian/children/${child.studentId}`, locale)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                    data-testid={`link-child-detail-${child.studentId}`}
                  >
                    <span>{isBn ? 'একাডেমিক প্রোফাইল ও তদারকি' : 'Academic Oversight'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 text-xs gap-1.5 h-8 rounded-full px-3"
                    onClick={() => handleRevoke(child.studentId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {dict.guardian.unlink}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive Dual-Tab Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border-border bg-card">
          <DialogHeader className="text-left pb-2">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <span>{isBn ? 'সন্তান / শিক্ষার্থী যুক্ত করুন' : 'Add Child / Student'}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn
                ? 'নতুন সন্তান প্রোফাইল বিস্তারিত তথ্য দিয়ে নিবন্ধন করুন অথবা পূর্বে নিবন্ধিত কোনো শিক্ষার্থীর অ্যাকাউন্ট লিঙ্ক করুন।'
                : 'Register a new child with full academic details or link an existing student account.'}
            </DialogDescription>
          </DialogHeader>

          {/* Tab selector */}
          <div className="flex p-1 bg-surface-muted rounded-2xl border border-border/80 gap-1 my-2">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'নতুন সন্তান নিবন্ধন' : 'Register New Child'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'link'
                  ? 'bg-card text-foreground shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'বিদ্যমান অ্যাকাউন্ট লিঙ্ক' : 'Link Existing Account'}</span>
            </button>
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="bg-destructive-soft border-destructive/30 my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium text-destructive">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {activeTab === 'register' ? (
            /* TAB 1: Register New Child with Full Info */
            <form onSubmit={handleRegisterChild} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="reg-child-name"
                    required
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'সন্তানের পুরো নাম' : "Child's Full Name"}
                  </Label>
                  <Input
                    id="reg-child-name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={isBn ? 'যেমন: তানভীর হোসাইন' : 'e.g. Tanvir Hossain'}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-child-dob" className="text-xs font-semibold text-foreground">
                    {isBn ? 'জন্ম তারিখ (বয়স গণনা ও সুরক্ষার জন্য)' : 'Date of Birth'}
                  </Label>
                  <Input
                    id="reg-child-dob"
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-child-gender"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'লিঙ্গ' : 'Gender'}
                  </Label>
                  <Select
                    value={regGender}
                    onValueChange={(val) => setRegGender(val as 'male' | 'female')}
                  >
                    <SelectTrigger
                      id="reg-child-gender"
                      className="rounded-2xl bg-card border-border text-sm"
                    >
                      <SelectValue placeholder={isBn ? 'লিঙ্গ নির্বাচন করুন' : 'Select gender'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{isBn ? 'ছেলে (Male)' : 'Male'}</SelectItem>
                      <SelectItem value="female">{isBn ? 'মেয়ে (Female)' : 'Female'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="reg-child-institution"
                      className="text-xs font-semibold text-foreground"
                    >
                      {isBn ? 'শিক্ষা প্রতিষ্ঠান / স্কুলের নাম' : 'School / Institution Name'}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setCustomInstitution((prev) => !prev)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      {customInstitution
                        ? isBn
                          ? 'তালিকা থেকে বাছুন'
                          : 'Select from list'
                        : isBn
                          ? 'তালিকায় না পেলে নিজে লিখুন'
                          : 'Type custom name'}
                    </button>
                  </div>
                  {customInstitution ? (
                    <Input
                      id="reg-child-institution"
                      value={regInstitution}
                      onChange={(e) => setRegInstitution(e.target.value)}
                      placeholder={
                        isBn
                          ? 'প্রতিষ্ঠানের নাম লিখুন (যেমন: রাজউক উত্তরা মডেল কলেজ)'
                          : 'Enter school or college name'
                      }
                    />
                  ) : (
                    <Select
                      value={regInstitution}
                      onValueChange={(val) => {
                        if (val === '__custom__') {
                          setCustomInstitution(true);
                          setRegInstitution('');
                        } else {
                          setRegInstitution(val);
                        }
                      }}
                    >
                      <SelectTrigger
                        id="reg-child-institution"
                        className="rounded-2xl bg-card border-border text-sm"
                      >
                        <SelectValue
                          placeholder={
                            isBn ? 'শিক্ষা প্রতিষ্ঠান নির্বাচন করুন' : 'Select Institution / School'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {institutions.map((inst) => (
                          <SelectItem key={inst.id} value={isBn ? inst.nameBn : inst.nameEn}>
                            {isBn ? inst.nameBn : inst.nameEn}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="font-semibold text-primary">
                          {isBn
                            ? '➕ অন্য কোনো প্রতিষ্ঠান লিখুন...'
                            : '➕ Enter other institution...'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-child-level"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'শ্রেণি / গ্রেড' : 'Grade / Education Level'}
                  </Label>
                  <Select
                    value={regEducationLevelId}
                    onValueChange={(val) => setRegEducationLevelId(val)}
                  >
                    <SelectTrigger
                      id="reg-child-level"
                      className="rounded-2xl bg-card border-border text-sm"
                    >
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
                  <Label
                    htmlFor="reg-child-curriculum"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'কারিকুলাম / মাধ্যম' : 'Curriculum'}
                  </Label>
                  <Select value={regCurriculumId} onValueChange={(val) => setRegCurriculumId(val)}>
                    <SelectTrigger
                      id="reg-child-curriculum"
                      className="rounded-2xl bg-card border-border text-sm"
                    >
                      <SelectValue
                        placeholder={isBn ? 'কারিকুলাম নির্বাচন করুন' : 'Select Curriculum'}
                      />
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
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="reg-child-stream"
                      className="text-xs font-semibold text-foreground"
                    >
                      {isBn ? 'শাখা / বিভাগ (ঐচ্ছিক)' : 'Stream / Group (Optional)'}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setCustomStream((prev) => !prev)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      {customStream
                        ? isBn
                          ? 'তালিকা থেকে বাছুন'
                          : 'Select from list'
                        : isBn
                          ? 'অন্য বিভাগ লিখুন'
                          : 'Type custom stream'}
                    </button>
                  </div>
                  {customStream ? (
                    <Input
                      id="reg-child-stream"
                      value={regStream}
                      onChange={(e) => setRegStream(e.target.value)}
                      placeholder={
                        isBn
                          ? 'যেমন: বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা'
                          : 'e.g. Science, Arts, Commerce'
                      }
                    />
                  ) : (
                    <Select
                      value={regStream}
                      onValueChange={(val) => {
                        if (val === '__custom__') {
                          setCustomStream(true);
                          setRegStream('');
                        } else {
                          setRegStream(val);
                        }
                      }}
                    >
                      <SelectTrigger
                        id="reg-child-stream"
                        className="rounded-2xl bg-card border-border text-sm"
                      >
                        <SelectValue
                          placeholder={
                            isBn ? 'শাখা / বিভাগ নির্বাচন করুন' : 'Select Stream / Group'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((st) => (
                          <SelectItem key={st.id} value={isBn ? st.nameBn : st.nameEn}>
                            {isBn ? st.nameBn : st.nameEn}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="font-semibold text-primary">
                          {isBn ? '➕ অন্য কোনো বিভাগ লিখুন...' : '➕ Enter other stream...'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="reg-child-goals"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'শেখার লক্ষ্য ও বিশেষ দুর্বলতা' : 'Learning Goals & Specific Needs'}
                  </Label>
                  <textarea
                    id="reg-child-goals"
                    value={regLearningGoals}
                    onChange={(e) => setRegLearningGoals(e.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-input bg-background p-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={
                      isBn
                        ? 'যেমন: পদার্থবিজ্ঞান ও উচ্চতর গণিতে দুর্বলতা কাটাতে হবে, বোর্ড পরীক্ষার প্রস্তুতি...'
                        : 'e.g. Needs help in Physics and Advanced Math, preparing for board exams...'
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-child-phone"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'সন্তানের মোবাইল নম্বর (যদি থাকে)' : "Child's Mobile (Optional)"}
                  </Label>
                  <Input
                    id="reg-child-phone"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+8801700000000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="reg-child-email"
                    className="text-xs font-semibold text-foreground"
                  >
                    {isBn ? 'সন্তানের ইমেইল (যদি থাকে)' : "Child's Email (Optional)"}
                  </Label>
                  <Input
                    id="reg-child-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="child@example.com"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="reg-select-relationship"
                    required
                    className="text-xs font-semibold text-foreground"
                  >
                    {dict.guardian.relationship}
                  </Label>
                  <Select
                    value={relationship}
                    onValueChange={(val) => setRelationship(toGuardianRelationship(val))}
                  >
                    <SelectTrigger
                      id="reg-select-relationship"
                      className="w-full rounded-2xl bg-card border-border text-sm"
                    >
                      <SelectValue placeholder={dict.guardian.relationship} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">{dict.guardian.father}</SelectItem>
                      <SelectItem value="mother">{dict.guardian.mother}</SelectItem>
                      <SelectItem value="legal_guardian">{dict.guardian.legalGuardian}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Minor Consent statement */}
              <div className="p-3.5 bg-surface-muted/60 rounded-2xl border border-border space-y-2 mt-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="reg-checkbox-consent"
                    checked={consentAgreed}
                    onCheckedChange={(checked) => setConsentAgreed(Boolean(checked))}
                    className="mt-0.5 cursor-pointer"
                  />
                  <Label
                    htmlFor="reg-checkbox-consent"
                    className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none font-normal"
                  >
                    <strong className="text-foreground block mb-0.5">
                      {dict.guardian.consentTitle} (v1.0-bd-minor-consent)
                    </strong>
                    {dict.guardian.consentAgreement}
                  </Label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-full px-5"
                >
                  {dict.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  isLoading={loading}
                  className="rounded-full px-6 shadow-xs font-semibold"
                >
                  {isBn ? 'সন্তান নিবন্ধন সম্পন্ন করুন' : 'Complete Registration'}
                </Button>
              </div>
            </form>
          ) : (
            /* TAB 2: Link Existing Student Account */
            <form onSubmit={handleLinkChild} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label
                  htmlFor="input-student-identifier"
                  required
                  className="text-xs font-semibold text-foreground"
                >
                  {dict.guardian.studentIdentifier}
                </Label>
                <Input
                  id="input-student-identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. +8801722222222 or student@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="select-relationship"
                  required
                  className="text-xs font-semibold text-foreground"
                >
                  {dict.guardian.relationship}
                </Label>
                <Select
                  value={relationship}
                  onValueChange={(val) => setRelationship(toGuardianRelationship(val))}
                >
                  <SelectTrigger
                    id="select-relationship"
                    className="w-full rounded-2xl bg-card border-border text-sm"
                  >
                    <SelectValue placeholder={dict.guardian.relationship} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">{dict.guardian.father}</SelectItem>
                    <SelectItem value="mother">{dict.guardian.mother}</SelectItem>
                    <SelectItem value="legal_guardian">{dict.guardian.legalGuardian}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3.5 bg-surface-muted/60 rounded-2xl border border-border space-y-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="checkbox-consent"
                    checked={consentAgreed}
                    onCheckedChange={(checked) => setConsentAgreed(Boolean(checked))}
                    className="mt-0.5 cursor-pointer"
                  />
                  <Label
                    htmlFor="checkbox-consent"
                    className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none font-normal"
                  >
                    <strong className="text-foreground block mb-0.5">
                      {dict.guardian.consentTitle} (v1.0-bd-minor-consent)
                    </strong>
                    {dict.guardian.consentAgreement}
                  </Label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-full px-5"
                >
                  {dict.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  isLoading={loading}
                  className="rounded-full px-6 shadow-xs font-semibold"
                >
                  {isBn ? 'অ্যাকাউন্ট লিঙ্ক করুন' : 'Link Student Account'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
