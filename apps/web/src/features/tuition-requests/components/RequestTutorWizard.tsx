'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Shield,
  HelpCircle,
  Clock,
  Send,
  Lock,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppSelector } from '@/store';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import {
  useGetCurriculaQuery,
  useGetEducationLevelsQuery,
  useGetStreamsQuery,
  useGetSubjectsQuery,
} from '@/store/services/taxonomy-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import { useCreateTuitionRequestMutation } from '@/store/services/tuition-requests-api';

interface RequestTutorWizardProps {
  locale: Locale;
  onSuccess?: () => void;
}

const BD_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Sylhet',
  'Barishal',
  'Rangpur',
  'Mymensingh',
];

const POPULAR_AREAS = [
  'Dhanmondi',
  'Mirpur',
  'Uttara',
  'Gulshan',
  'Banani',
  'Mohammadpur',
  'Bashundhara R/A',
  'Badda',
  'Shantinagar',
  'Malibagh',
  'Lalmatia',
  'Khilgaon',
  'Motijheel',
  'Puran Dhaka',
  'Agrabad (Chattogram)',
  'Nasirabad (Chattogram)',
  'GEC (Chattogram)',
  'Kazir Dewri (Chattogram)',
  'Zindabazar (Sylhet)',
  'Shaheb Bazar (Rajshahi)',
];

const WEEKDAYS = [
  { id: 'Sun', en: 'Sunday', bn: 'রবিবার' },
  { id: 'Mon', en: 'Monday', bn: 'সোমবার' },
  { id: 'Tue', en: 'Tuesday', bn: 'মঙ্গলবার' },
  { id: 'Wed', en: 'Wednesday', bn: 'বুধবার' },
  { id: 'Thu', en: 'Thursday', bn: 'বৃহস্পতিবার' },
  { id: 'Fri', en: 'Friday', bn: 'শুক্রবার' },
  { id: 'Sat', en: 'Saturday', bn: 'শনিবার' },
];

export function RequestTutorWizard({ locale, onSuccess }: RequestTutorWizardProps) {
  const router = useRouter();
  const isBn = locale === 'bn';
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  const [step, setStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReference, setSuccessReference] = useState<string | null>(null);

  // Form State
  const isGuardian = Boolean(user?.roles?.includes('guardian'));
  const { data: linkedChildren } = useGetLinkedChildrenQuery(undefined, { skip: !isGuardian });
  const [selectedChildId, setSelectedChildId] = useState<string>('new');
  const [studentUserId, setStudentUserId] = useState<string | null>(null);

  const [studentName, setStudentName] = useState(user?.displayName || '');
  const [studentGender, setStudentGender] = useState<'male' | 'female'>('male');
  const [institutionName, setInstitutionName] = useState('');
  const [curriculumId, setCurriculumId] = useState<string>('');
  const [educationLevelId, setEducationLevelId] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [learningMode, setLearningMode] = useState<'in_person' | 'online' | 'hybrid'>('in_person');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [preferredDays, setPreferredDays] = useState<string[]>(['Sun', 'Tue', 'Thu']);
  const [preferredTime, setPreferredTime] = useState('Evening (5:00 PM - 7:00 PM)');
  const [salaryBudgetMin, setSalaryBudgetMin] = useState(6000);
  const [salaryBudgetMax, setSalaryBudgetMax] = useState(8000);
  const [preferredTutorGender, setPreferredTutorGender] = useState<'any' | 'male' | 'female'>('any');
  const [preferredTutorBackground, setPreferredTutorBackground] = useState('');
  const [requirementsNotes, setRequirementsNotes] = useState('');
  const [isVip, setIsVip] = useState(false);

  // Taxonomy Data
  const { data: curriculaData, isLoading: currLoading } = useGetCurriculaQuery();
  const { data: levelsData, isLoading: levelsLoading } = useGetEducationLevelsQuery();
  const { data: streamsData } = useGetStreamsQuery();
  const { data: subjectsData, isLoading: subsLoading } = useGetSubjectsQuery();

  const [createRequest, { isLoading: isSubmitting }] = useCreateTuitionRequestMutation();

  const curricula = curriculaData?.data || [];
  const levels = levelsData?.data || [];
  const streams = streamsData?.data || [];
  const subjects = subjectsData?.data || [];

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleDay = (dayId: string) => {
    setPreferredDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  };

  const validateStep1 = () => {
    if (!studentName.trim()) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে শিক্ষার্থীর নাম লিখুন' : 'Please enter the student name');
      return false;
    }
    if (selectedSubjectIds.length === 0) {
      setErrorMsg(isBn ? 'কমপক্ষে একটি বিষয় নির্বাচন করুন' : 'Please select at least one subject');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (learningMode !== 'online' && !district.trim()) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে জেলা নির্বাচন করুন' : 'Please specify district');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      // Save draft in session storage and prompt login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_tuition_request', JSON.stringify({
          studentName,
          curriculumId,
          educationLevelId,
          streamId,
          subjectIds: selectedSubjectIds,
          learningMode,
          division,
          district,
          area,
          daysPerWeek,
          preferredDays,
          preferredTime,
          salaryBudgetMin,
          salaryBudgetMax,
          preferredTutorGender,
          preferredTutorBackground,
          requirementsNotes,
          isVip,
        }));
      }
      router.push(withLocale('/login?redirect=/request-tutor', locale));
      return;
    }

    try {
      const res = await createRequest({
        studentUserId: studentUserId || undefined,
        studentName,
        studentGender,
        institutionName: institutionName || undefined,
        curriculumId: curriculumId || undefined,
        educationLevelId: educationLevelId || undefined,
        streamId: streamId || undefined,
        subjectIds: selectedSubjectIds,
        learningMode,
        division,
        district,
        area: area || undefined,
        addressDetails: addressDetails || undefined,
        daysPerWeek,
        preferredDays,
        preferredTime,
        salaryBudgetMin,
        salaryBudgetMax,
        salaryType: 'monthly',
        preferredTutorGender,
        preferredTutorBackground: preferredTutorBackground || undefined,
        requirementsNotes: requirementsNotes || undefined,
        isVip,
      }).unwrap();

      setSuccessReference(res.data?.requestReference || 'TR-2026-CONFIRMED');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || (isBn ? 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে' : 'Failed to submit request'));
    }
  };

  if (successReference) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-500/30 bg-card shadow-lg p-8 text-center animate-in zoom-in-95">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isBn ? 'টিউশন রিকোয়েস্ট সফলভাবে জমা হয়েছে!' : 'Tuition Request Submitted Successfully!'}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          {isBn
            ? `আপনার রিকোয়েস্ট রেফারেন্স: ${successReference}। আমাদের একাডেমিক ম্যাচিং টিম আপনার পছন্দ অনুযায়ী সেরা টিউটর সাজেস্ট করবে এবং আপনাকে নোটিফিকেশন পাঠাবে।`
            : `Reference Code: ${successReference}. Our academic matching team is evaluating top-tier tutors and will notify you with curated suggestions.`}
        </p>

        <div className="p-4 rounded-xl bg-muted/40 border border-border text-left max-w-md mx-auto mb-6 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'শিক্ষার্থী:' : 'Student:'}</span>
            <span className="font-semibold">{studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'পদ্ধতি:' : 'Mode:'}</span>
            <span className="font-semibold capitalize">{learningMode.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isBn ? 'বাজেট:' : 'Budget:'}</span>
            <span className="font-semibold">৳ {salaryBudgetMin} - ৳ {salaryBudgetMax} / মাস</span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(withLocale('/dashboard/guardian/requests', locale))}
          >
            {isBn ? 'আমার রিকোয়েস্ট দেখুন' : 'View My Requests'}
          </Button>
          <Button
            onClick={() => {
              setSuccessReference(null);
              setStep(1);
            }}
          >
            {isBn ? 'নতুন রিকোয়েস্ট পোস্ট করুন' : 'Post Another Request'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Wizard Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 text-xs font-semibold">
          <span className={step >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'}>
            1. {isBn ? 'শিক্ষার্থী ও বিষয়' : 'Student & Subject'}
          </span>
          <span className={step >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'}>
            2. {isBn ? 'মাধ্যম ও এলাকা' : 'Mode & Location'}
          </span>
          <span className={step >= 3 ? 'text-primary font-bold' : 'text-muted-foreground'}>
            3. {isBn ? 'শিডিউল ও বাজেট' : 'Schedule & Budget'}
          </span>
          <span className={step >= 4 ? 'text-primary font-bold' : 'text-muted-foreground'}>
            4. {isBn ? 'রিভিউ ও নিশ্চিতকরণ' : 'Review & Submit'}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Student & Subjects */}
      {step === 1 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                {isBn ? 'শিক্ষার্থী ও বিষয় নির্বাচন করুন' : 'Student & Subject Details'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'আপনার প্রয়োজন অনুযায়ী যেকোনো মাধ্যম ও বিষয়ের জন্য রিকোয়েস্ট তৈরি করুন'
                  : 'Specify what you or your child wants to learn from our nationwide educators'}
              </p>
            </div>

            {/* Guardian Child Selector */}
            {isGuardian && (linkedChildren || []).length > 0 && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  {isBn ? 'কার জন্য গৃহশিক্ষক প্রয়োজন? (আপনার সন্তান নির্বাচন করুন)' : 'Who is this tuition for? (Select Child)'}
                </label>
                <Select
                  value={selectedChildId}
                  onValueChange={(val) => {
                    setSelectedChildId(val);
                    if (val === 'new') {
                      setStudentUserId(null);
                      setStudentName('');
                    } else {
                      const ch = linkedChildren?.find((c) => c.studentId === val);
                      if (ch) {
                        setStudentUserId(ch.studentId);
                        setStudentName(ch.displayName);
                        if (ch.institutionName) setInstitutionName(ch.institutionName);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      {isBn ? '➕ নতুন শিক্ষার্থীর জন্য রিকোয়েস্ট তৈরি করুন' : '➕ Enter New Student Info'}
                    </SelectItem>
                    {(linkedChildren || []).map((ch) => (
                      <SelectItem key={ch.studentId} value={ch.studentId}>
                        🎓 {ch.displayName} {ch.institutionName ? '(' + ch.institutionName + ')' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedChildId !== 'new' && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {isBn ? 'সন্তানের অ্যাকাউন্টের সাথে স্বয়ংক্রিয়ভাবে সংযুক্ত করা হয়েছে।' : 'Linked to child profile automatically.'}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শিক্ষার্থীর নাম *' : 'Student Name *'}
                </label>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={isBn ? 'নাম লিখুন' : 'e.g., Ahsan Habib'}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শিক্ষার্থীর জেন্ডার' : 'Student Gender'}
                </label>
                <Select
                  value={studentGender}
                  onValueChange={(val: any) => setStudentGender(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{isBn ? 'ছাত্র (ছেলে)' : 'Male'}</SelectItem>
                    <SelectItem value="female">{isBn ? 'ছাত্রী (মেয়ে)' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'কারিকুলাম / ট্র্যাক' : 'Curriculum / Track'}
                </label>
                <Select value={curriculumId} onValueChange={setCurriculumId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isBn ? 'কারিকুলাম নির্বাচন করুন' : 'Select curriculum'} />
                  </SelectTrigger>
                  <SelectContent>
                    {curricula.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {isBn ? c.nameBn : c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শ্রেণি / লেভেল' : 'Class / Education Level'}
                </label>
                <Select value={educationLevelId} onValueChange={setEducationLevelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isBn ? 'লেভেল নির্বাচন করুন' : 'Select level'} />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((lvl) => (
                      <SelectItem key={lvl.id} value={lvl.id}>
                        {isBn ? lvl.nameBn : lvl.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শাখা / বিভাগ (ঐচ্ছিক)' : 'Stream (Optional)'}
                </label>
                <Select value={streamId} onValueChange={setStreamId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isBn ? 'শাখা নির্বাচন করুন' : 'Select stream'} />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {isBn ? s.nameBn : s.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {isBn ? 'বর্তমান স্কুল / কলেজ / বিশ্ববিদ্যালয়ের নাম' : 'Current School / College / University'}
              </label>
              <Input
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder={isBn ? 'যেমন: আইডিয়াল স্কুল, নটর ডেম কলেজ, বা বুয়েট' : 'e.g., Notre Dame College, Dhaka'}
              />
            </div>

            {/* Subject Selection Multi-Select Badges */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                {isBn ? 'কি কি বিষয় পড়াতে চান? (একাধিক সিলেক্ট করতে পারেন) *' : 'Select Subject(s) *'}
              </label>
              {subsLoading ? (
                <div className="py-4 text-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-3 rounded-xl border border-border bg-muted/20">
                  {subjects.map((s) => {
                    const isSelected = selectedSubjectIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm font-bold scale-[1.02]'
                            : 'bg-card border border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isBn ? s.nameBn : s.nameEn}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {isBn
                  ? `নির্বাচিত বিষয়: ${selectedSubjectIds.length} টি`
                  : `Selected subjects: ${selectedSubjectIds.length}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mode & Location */}
      {step === 2 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {isBn ? 'পড়ানোর মাধ্যম ও লোকেশন' : 'Learning Mode & Location'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'শিক্ষার্থী কীভাবে পড়তে চায় এবং কোন এলাকায় শিক্ষক প্রয়োজন?'
                  : 'How and where should the classes take place?'}
              </p>
            </div>

            {/* Mode Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'in_person',
                  titleEn: 'Home Tutoring',
                  titleBn: 'বাসায় এসে পড়ানো',
                  descEn: 'Tutor visits student home in-person',
                  descBn: 'শিক্ষক শিক্ষার্থীর বাসায় এসে পড়াবেন',
                },
                {
                  id: 'online',
                  titleEn: 'Online 1-on-1',
                  titleBn: 'অনলাইন লাইভ ক্লাস',
                  descEn: 'Interactive live video & whiteboard',
                  descBn: 'লাইভ ভিডিও ও ডিজিটাল হোয়াইটবোর্ড',
                },
                {
                  id: 'hybrid',
                  titleEn: 'Hybrid',
                  titleBn: 'হাইব্রিড (বাসা + অনলাইন)',
                  descEn: 'Mix of home visits & online lessons',
                  descBn: 'প্রয়োজন অনুযায়ী বাসা ও অনলাইন সমন্বিত',
                },
              ].map((m) => {
                const isSelected = learningMode === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setLearningMode(m.id as any)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-foreground">
                        {isBn ? m.titleBn : m.titleEn}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{isBn ? m.descBn : m.descEn}</p>
                  </div>
                );
              })}
            </div>

            {/* Location Details (if in_person or hybrid) */}
            {learningMode !== 'online' && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      {isBn ? 'বিভাগ' : 'Division'}
                    </label>
                    <Select value={division} onValueChange={setDivision}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BD_DIVISIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      {isBn ? 'জেলা *' : 'District *'}
                    </label>
                    <Input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g., Dhaka"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isBn ? 'এলাকা / থানা' : 'Area / Locality'}
                  </label>
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={isBn ? 'যেমন: ধানমন্ডি, মিরপুর ১০, উত্তরা সেক্টর ৪' : 'e.g., Dhanmondi 27'}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {POPULAR_AREAS.slice(0, 8).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setArea(a)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    {isBn ? 'বাসার বিস্তারিত ঠিকানা / রোড (গোপন রাখা হবে)' : 'Detailed Address / Landmark (Private)'}
                  </label>
                  <Input
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder={isBn ? 'যেমন: রোড #৭, বাড়ি #১২/এ (শুধুমাত্র নির্বাচিত শিক্ষকের সাথে শেয়ার হবে)' : 'Road/House details for matched tutor only'}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isBn
                      ? '🔒 এই তথ্যটি পাবলিকলি দেখানো হবে না, শুধুমাত্র ডেমো বা কনফার্মেশন নিশ্চিত হলে টিউটরকে জানানো হবে।'
                      : '🔒 Kept confidential. Shared with the tutor only after match confirmation.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Schedule, Budget & Preferred Tutor */}
      {step === 3 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {isBn ? 'শিডিউল, বাজেট ও শিক্ষকের যোগ্যতা' : 'Schedule, Budget & Tutor Preference'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'আপনার সাধ্য ও সুবিধাজনক সময়ের সাথে মিলিয়ে সেরা শিক্ষক প্রস্তাব দেওয়া হবে'
                  : 'Tailor your days, budget offer, and educator background expectations'}
              </p>
            </div>

            {/* Days per week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'সপ্তাহে কত দিন পড়াতে হবে?' : 'Days Per Week'}
                </label>
                <Select
                  value={String(daysPerWeek)}
                  onValueChange={(val) => setDaysPerWeek(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{isBn ? '১ দিন / সপ্তাহ' : '1 Day / Week'}</SelectItem>
                    <SelectItem value="2">{isBn ? '২ দিন / সপ্তাহ' : '2 Days / Week'}</SelectItem>
                    <SelectItem value="3">{isBn ? '৩ দিন / সপ্তাহ (সবচেয়ে জনপ্রিয়)' : '3 Days / Week (Popular)'}</SelectItem>
                    <SelectItem value="4">{isBn ? '৪ দিন / সপ্তাহ' : '4 Days / Week'}</SelectItem>
                    <SelectItem value="5">{isBn ? '৫ দিন / সপ্তাহ' : '5 Days / Week'}</SelectItem>
                    <SelectItem value="6">{isBn ? '৬ দিন / সপ্তাহ' : '6 Days / Week'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'পছন্দের সময়' : 'Preferred Time'}
                </label>
                <Input
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder={isBn ? 'যেমন: বিকাল ৫টা - সন্ধ্যা ৭টা' : 'e.g., Evening 5:00 PM'}
                />
              </div>
            </div>

            {/* Preferred Days Picker */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                {isBn ? 'পছন্দের দিনসমূহ' : 'Preferred Days'}
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((w) => {
                  const isChecked = preferredDays.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleDay(w.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'bg-muted/40 border border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {isBn ? w.bn : w.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salary Budget Range */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {isBn ? 'মাসিক সম্মানীর বাজেট (টাকায়)' : 'Monthly Budget Range (BDT)'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">{isBn ? 'সর্বনিম্ন (৳)' : 'Min (BDT)'}</span>
                  <Input
                    type="number"
                    value={salaryBudgetMin}
                    onChange={(e) => setSalaryBudgetMin(Number(e.target.value))}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">{isBn ? 'সর্বোচ্চ (৳)' : 'Max (BDT)'}</span>
                  <Input
                    type="number"
                    value={salaryBudgetMax}
                    onChange={(e) => setSalaryBudgetMax(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Tutor Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শিক্ষকের জেন্ডার পছন্দ' : 'Preferred Tutor Gender'}
                </label>
                <Select
                  value={preferredTutorGender}
                  onValueChange={(val: any) => setPreferredTutorGender(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{isBn ? 'যেকোনো অভিজ্ঞ শিক্ষক' : 'Any Qualified Tutor'}</SelectItem>
                    <SelectItem value="male">{isBn ? 'পুরুষ শিক্ষক (Male)' : 'Male Tutor'}</SelectItem>
                    <SelectItem value="female">{isBn ? 'মহিলা শিক্ষক (Female)' : 'Female Tutor'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isBn ? 'শিক্ষকের শিক্ষাপ্রতিষ্ঠান পছন্দ (ঐচ্ছিক)' : 'Preferred University / Institution'}
                </label>
                <Input
                  value={preferredTutorBackground}
                  onChange={(e) => setPreferredTutorBackground(e.target.value)}
                  placeholder={isBn ? 'যেমন: বুয়েট, ঢাবি, মেডিকেল, ইংলিশ মিডিয়াম ব্যাকগ্রাউন্ড' : 'e.g., BUET, DU, Medical, IBA'}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {isBn ? 'বিশেষ কোনো নির্দেশনা বা শিক্ষার্থীর দুর্বলতা (ঐচ্ছিক)' : 'Special Instructions or Focus Topics'}
              </label>
              <textarea
                rows={3}
                value={requirementsNotes}
                onChange={(e) => setRequirementsNotes(e.target.value)}
                placeholder={isBn ? 'যেমন: ফিজিক্সে দুর্বলতা রয়েছে, সামনে বোর্ড পরীক্ষা, অধ্যায়ভিত্তিক পরীক্ষা নিতে হবে...' : 'e.g., Needs special help in calculus, preparing for board exam in 4 months...'}
                className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review, VIP Concierge & Submit */}
      {step === 4 && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isBn ? 'রিভিউ ও নিশ্চিতকরণ' : 'Review & Confirmation'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'আপনার রিকোয়েস্টের সারসংক্ষেপ দেখে নিন এবং সাবমিট করুন'
                  : 'Review the details before submitting to our matching desk'}
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">{isBn ? 'শিক্ষার্থী:' : 'Student:'}</span>
                  <p className="font-semibold">{studentName} ({studentGender})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isBn ? 'পদ্ধতি ও এলাকা:' : 'Mode & Area:'}</span>
                  <p className="font-semibold capitalize">
                    {learningMode.replace('_', ' ')} {area ? `(${area}, ${district})` : `(${district})`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isBn ? 'শিডিউল:' : 'Schedule:'}</span>
                  <p className="font-semibold">{daysPerWeek} {isBn ? 'দিন/সপ্তাহ' : 'days/wk'} ({preferredDays.join(', ')})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isBn ? 'সম্মানী বাজেট:' : 'Budget Offer:'}</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">৳ {salaryBudgetMin} - ৳ {salaryBudgetMax} / মাস</p>
                </div>
              </div>

              {preferredTutorBackground && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground">{isBn ? 'টিউটর পছন্দ:' : 'Tutor Criteria:'}</span>
                  <p className="font-medium">{preferredTutorBackground} ({preferredTutorGender} preferred)</p>
                </div>
              )}
            </div>

            {/* VIP Fast-Track Concierge Option */}
            <div
              onClick={() => setIsVip(!isVip)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                isVip
                  ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                  : 'border-border bg-card hover:bg-muted/30'
              }`}
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={() => {}}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {isBn ? '⚡ ভিআইপি ফাস্ট-ট্র্যাক কনসিয়ার্জ (VIP Express)' : '⚡ VIP Express Concierge'}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                    Fast Match
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn
                    ? '৬-১২ ঘণ্টার মধ্যে বুয়েট/মেডিকেল/ঢাবির টপ ১% ভেরিফাইড শিক্ষক কনফার্মেশন, ডেডিকেটেড একাডেমিক কোঅর্ডিনেটর এবং ফ্রি রিপ্লেসমেন্ট সুবিধা।'
                    : 'Matched within 6-12 hours with top 1% verified tutors (BUET/Medical/DU), dedicated academic counselor, and unlimited replacements.'}
                </p>
              </div>
            </div>

            {/* Platform Guarantee Pill */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <Shield className="w-4 h-4 shrink-0" />
              <span>
                {isBn
                  ? '১০০% ফ্রি রিপ্লেসমেন্ট গ্যারান্টি: প্রথম ২টি ক্লাসে সন্তুষ্ট না হলে বিনামূল্যে বিকল্প শিক্ষক নির্বাচন।'
                  : '100% Free Replacement Guarantee: Not satisfied in first 2 classes? Instant free replacement.'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {isBn ? 'পূর্ববর্তী' : 'Back'}
          </Button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <Button onClick={handleNext} className="flex items-center gap-1.5">
            {isBn ? 'পরবর্তী ধাপ' : 'Next Step'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 flex items-center gap-2 shadow-md"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isBn ? 'রিকোয়েস্ট পোস্ট করুন' : 'Submit Request'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
