'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
  Calendar,
  Shield,
  Sparkles,
  Upload,
  FileCheck,
  Eye,
  FileText,
  Check,
  ChevronRight,
  Laptop,
  Home,
  MapPin,
  User,
  ShieldCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale, dashboardPathForRoles } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import {
  useGetMyOnboardingQuery,
  useCompleteOnboardingStepMutation,
  type OnboardingStep,
} from '@/store/services/onboarding-api';
import { useUploadEvidenceMutation } from '@/store/services/files-api';
import { useGetSubjectsQuery, useGetEducationLevelsQuery } from '@/store/services/taxonomy-api';
import { normalizeUnknownError } from '@/lib/api-error';
import { STATIC_DEV_OTP } from '@ogroniedu/contracts';
import { buildStepPayload, fieldsForStep, type StepField } from '../step-forms';
import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Progress,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui';

function getStepIcon(stepKey: string) {
  switch (stepKey) {
    case 'contact_verification':
      return ShieldCheck;
    case 'profile':
      return User;
    case 'education':
      return GraduationCap;
    case 'subjects':
      return BookOpen;
    case 'availability':
      return Calendar;
    case 'documents':
      return FileCheck;
    case 'learning_preferences':
      return BookOpen;
    case 'link_student':
      return GraduationCap;
    case 'security_setup':
      return Shield;
    case 'review':
      return Sparkles;
    default:
      return Layers;
  }
}

function StepIcon({ status }: { status: OnboardingStep['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-primary" />;
  if (status === 'pending_review') return <Clock className="h-5 w-5 text-warning" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

/** Fallback generic step form for student/guardian and non-custom steps */
function StepForm({
  step,
  role,
  locale,
  onSubmit,
  isSubmitting,
}: {
  step: OnboardingStep;
  role: string | null;
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const fields = fieldsForStep(role, step.key);
  const [values, setValues] = React.useState<Record<string, string | boolean>>({});

  function setValue(name: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(buildStepPayload(step.key, values));
  }

  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {isBn
          ? 'এই ধাপটি প্ল্যাটফর্ম কর্তৃপক্ষের মাধ্যমে সম্পন্ন হবে।'
          : 'This step is completed by the platform, not from the form.'}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 text-left w-full"
      data-testid={`onboarding-form-${step.key}`}
    >
      {fields.map((field: StepField) => {
        const id = `onboarding-${step.key}-${field.name}`;
        const label = isBn ? field.labelBn : field.labelEn;
        if (field.kind === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={values[field.name] === true}
                onCheckedChange={(checked) => setValue(field.name, Boolean(checked))}
              />
              <Label htmlFor={id} className="text-xs text-foreground cursor-pointer font-normal">
                {label}
              </Label>
            </div>
          );
        }
        return (
          <div key={field.name} className="flex flex-col gap-1.5 text-left">
            <Label htmlFor={id} className="text-xs font-semibold text-foreground">
              {label}
              {field.required ? ' *' : ''}
            </Label>
            {field.kind === 'textarea' ? (
              <Textarea
                id={id}
                rows={3}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="text-xs"
              />
            ) : (
              <Input
                id={id}
                type={field.kind === 'number' ? 'number' : 'text'}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="text-xs"
              />
            )}
          </div>
        );
      })}

      <Button
        type="submit"
        isLoading={isSubmitting}
        size="sm"
        className="w-full sm:w-auto font-semibold px-6"
      >
        {isBn ? 'সংরক্ষণ করুন' : 'Save & continue'}
      </Button>
    </form>
  );
}

/** STUDENT STEP 1: STUDENT PROFILE STEP FORM */
function StudentProfileStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const { data: levelsData, isLoading: loadingLevels } = useGetEducationLevelsQuery();
  const levelsList = levelsData?.data ?? [];

  const [studentType, setStudentType] = React.useState<'standalone' | 'dependent'>('standalone');
  const [institutionName, setInstitutionName] = React.useState('নটর ডেম কলেজ (Notre Dame College)');
  const [educationLevelId, setEducationLevelId] = React.useState('');
  const [stream, setStream] = React.useState('Science');
  const [district, setDistrict] = React.useState('Dhaka');
  const [learningGoals, setLearningGoals] = React.useState(
    'এইচএসসি পরীক্ষার সর্বোচ্চ প্রস্তুতি ও বুয়েট/মেডিকেল ভর্তি পরীক্ষার প্রাথমিক বুনিয়াদি তৈরি করতে চাই।'
  );

  React.useEffect(() => {
    if (levelsList.length > 0 && !educationLevelId) {
      setEducationLevelId(levelsList[0].id);
    }
  }, [levelsList, educationLevelId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      studentType,
      institutionName: institutionName.trim(),
      educationLevelId,
      stream,
      districtCode: district.toLowerCase(),
      district,
      learningGoals: learningGoals.trim(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-student-profile-form"
    >
      {/* Student Persona Type Card */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold text-foreground">
          {isBn ? 'শিক্ষার্থীর ধরন নির্বাচন করুন' : 'Select Student Profile Type'} *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setStudentType('standalone')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              studentType === 'standalone'
                ? 'border-primary bg-primary/5 text-foreground shadow-2xs font-semibold'
                : 'border-border/60 bg-card hover:border-border hover:bg-muted/30 text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                studentType === 'standalone' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground block">
                {isBn ? 'স্বতন্ত্র শিক্ষার্থী (প্রাপ্তবয়স্ক / স্বাবলম্বী)' : 'Standalone Student (Adult)'}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">
                {isBn
                  ? 'সরাসরি শিক্ষক নির্বাচন, বুকিং ও নিজ একাউন্ট থেকে ফি পরিশোধের সম্পূর্ণ সুবিধা।'
                  : 'Direct payment authority, escrow bookings, and self-managed learning.'}
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                studentType === 'standalone'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40 bg-transparent'
              }`}
            >
              {studentType === 'standalone' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          <div
            onClick={() => setStudentType('dependent')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              studentType === 'dependent'
                ? 'border-primary bg-primary/5 text-foreground shadow-2xs font-semibold'
                : 'border-border/60 bg-card hover:border-border hover:bg-muted/30 text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                studentType === 'dependent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground block">
                {isBn ? 'স্কুল / কলেজ শিক্ষার্থী (অভিভাবকের তত্ত্বাবধানে)' : 'School Student (Under Guardian)'}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">
                {isBn
                  ? 'ক্লাস ও স্টাডি রুমে উপস্থিতি সুবিধা; পেমেন্ট ও মূল অনুমোদন অভিভাবকের দায়িত্বে।'
                  : 'Attends live classes; payments and critical approvals handled by guardian.'}
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                studentType === 'dependent'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40 bg-transparent'
              }`}
            >
              {studentType === 'dependent' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'শিক্ষা প্রতিষ্ঠানের নাম' : 'Institution / College Name'} *
          </Label>
          <Input
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder={isBn ? 'যেমন: ঢাকা কলেজ, নটর ডেম কলেজ' : 'e.g. Notre Dame College'}
            required
            className="text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'বর্তমান শ্রেণি / শিক্ষা লেভেল' : 'Class / Education Level'} *
          </Label>
          <Select
            value={educationLevelId}
            onValueChange={setEducationLevelId}
            disabled={loadingLevels}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder={isBn ? 'শ্রেণি নির্বাচন করুন' : 'Select level'} />
            </SelectTrigger>
            <SelectContent>
              {levelsList.map((lvl) => (
                <SelectItem key={lvl.id} value={lvl.id}>
                  {isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'বিভাগ / স্ট্রিম (Stream)' : 'Academic Stream'} *
          </Label>
          <Select value={stream} onValueChange={setStream}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Science">{isBn ? 'বিজ্ঞান (Science)' : 'Science'}</SelectItem>
              <SelectItem value="Commerce">{isBn ? 'ব্যবসায় শিক্ষা (Commerce)' : 'Commerce'}</SelectItem>
              <SelectItem value="Humanities">{isBn ? 'মানবিক (Humanities)' : 'Humanities'}</SelectItem>
              <SelectItem value="General">{isBn ? 'সাধারণ (General)' : 'General'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'বর্তমান জেলা' : 'District'} *
          </Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'কারিকুলাম' : 'Curriculum'}
          </Label>
          <Input
            defaultValue={isBn ? 'জাতীয় শিক্ষাক্রম (NCTB)' : 'National Curriculum (NCTB)'}
            readOnly
            className="text-xs bg-muted/40 cursor-default"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'শেখার লক্ষ্য ও বিশেষ চাহিদা' : 'Learning Goals & Specific Needs'}
          </Label>
          <span className="text-[11px] text-muted-foreground font-mono">
            {learningGoals.length} / 500
          </span>
        </div>
        <Textarea
          rows={3}
          maxLength={500}
          value={learningGoals}
          onChange={(e) => setLearningGoals(e.target.value)}
          placeholder={isBn ? 'যেমন: এইচএসসি প্রস্তুতি, গণিত ও পদার্থবিজ্ঞানের কনসেপ্ট ক্লিয়ারিং...' : 'Describe your academic goals...'}
          className="text-xs resize-y"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-student-profile"
        >
          {isBn ? 'প্রোফাইল সংরক্ষণ করুন ও এগিয়ে যান' : 'Save Profile & Continue'}
        </Button>
      </div>
    </form>
  );
}

/** STUDENT STEP 2: LEARNING PREFERENCES STEP FORM */
function StudentLearningPreferencesStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const { data: subjectsData, isLoading: loadingSubjects } = useGetSubjectsQuery();
  const subjectsList = subjectsData?.data ?? [];

  const [teachingModes, setTeachingModes] = React.useState<string[]>(['online', 'student_home']);
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>(['Physics', 'Higher Math']);
  const [genderPreference, setGenderPreference] = React.useState('any');
  const [budgetPerHour, setBudgetPerHour] = React.useState('600');
  const [preferredLocale, setPreferredLocale] = React.useState<'bn' | 'en'>(locale);

  const toggleMode = (mode: string) => {
    setTeachingModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      teachingModes,
      subjects: selectedSubjects,
      genderPreference,
      budgetPerHour: Number(budgetPerHour) || 600,
      preferredLocale,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-learning-preferences-form"
    >
      {/* Learning Modes */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold text-foreground">
          {isBn ? 'পছন্দের পাঠদান মাধ্যম' : 'Preferred Teaching Modes'} *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'online', labelBn: 'অনলাইন ক্লাস', labelEn: 'Online Class', icon: Laptop },
            { id: 'student_home', labelBn: 'শিক্ষার্থীর বাসা', labelEn: 'Student Home', icon: Home },
            { id: 'tutor_home', labelBn: 'শিক্ষকের স্থান', labelEn: 'Tutor Place', icon: MapPin },
          ].map((mode) => {
            const isSelected = teachingModes.includes(mode.id);
            const ModeIcon = mode.icon;
            return (
              <div
                key={mode.id}
                onClick={() => toggleMode(mode.id)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-foreground shadow-2xs font-semibold'
                    : 'border-border/60 bg-card hover:border-border hover:bg-muted/30 text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ModeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs block font-medium">
                    {isBn ? mode.labelBn : mode.labelEn}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40 bg-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Subjects Multi-select */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold text-foreground">
          {isBn ? 'যে বিষয়গুলোতে শিক্ষক প্রয়োজন' : 'Subjects Needed'} *
        </Label>
        <div className="flex flex-wrap gap-2 pt-1">
          {['Physics', 'Higher Math', 'Chemistry', 'Biology', 'English', 'ICT', 'Bangla', 'General Math'].map(
            (subName) => {
              const isSelected = selectedSubjects.includes(subName);
              return (
                <button
                  key={subName}
                  type="button"
                  onClick={() => toggleSubject(subName)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 border border-border/80 text-foreground hover:bg-muted'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{subName}</span>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'শিক্ষকের জেন্ডার পছন্দ' : 'Tutor Gender Preference'}
          </Label>
          <Select value={genderPreference} onValueChange={setGenderPreference}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{isBn ? 'যেকোনো জেন্ডার (Any)' : 'Any Gender'}</SelectItem>
              <SelectItem value="male">{isBn ? 'শুধুমাত্র পুরুষ শিক্ষক (Male Only)' : 'Male Only'}</SelectItem>
              <SelectItem value="female">{isBn ? 'শুধুমাত্র নারী শিক্ষক (Female Only)' : 'Female Only'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'প্রত্যাশিত ঘণ্টা প্রতি বাজেট (টাকা)' : 'Target Hourly Budget (BDT)'}
          </Label>
          <Input
            type="number"
            min={200}
            max={5000}
            step={50}
            value={budgetPerHour}
            onChange={(e) => setBudgetPerHour(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'পছন্দের নোটিফিকেশন ভাষা' : 'Preferred Language'}
          </Label>
          <Select
            value={preferredLocale}
            onValueChange={(val) => setPreferredLocale(val as 'bn' | 'en')}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-learning-preferences"
        >
          {isBn ? 'পছন্দসমূহ সংরক্ষণ করুন ও অনবোর্ডিং সম্পন্ন করুন' : 'Save Preferences & Complete'}
        </Button>
      </div>
    </form>
  );
}

/** GUARDIAN STEP 1: GUARDIAN PROFILE STEP FORM */
function GuardianProfileStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const [relationshipType, setRelationshipType] = React.useState('father');
  const [occupation, setOccupation] = React.useState('Engineer / Service Holder');
  const [district, setDistrict] = React.useState('Dhaka');
  const [area, setArea] = React.useState('ধানমন্ডি, ঢাকা (Dhanmondi, Dhaka)');
  const [emergencyPhone, setEmergencyPhone] = React.useState('+8801712345678');
  const [preferredLocale, setPreferredLocale] = React.useState<'bn' | 'en'>(locale);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      relationshipType,
      occupation: occupation.trim(),
      district,
      area: area.trim(),
      emergencyPhone: emergencyPhone.trim(),
      preferredLocale,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-guardian-profile-form"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'শিক্ষার্থীর সাথে সম্পর্ক' : 'Relationship to Student'} *
          </Label>
          <Select value={relationshipType} onValueChange={setRelationshipType}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="father">{isBn ? 'পিতা / বাবা (Father)' : 'Father'}</SelectItem>
              <SelectItem value="mother">{isBn ? 'মাতা / মা (Mother)' : 'Mother'}</SelectItem>
              <SelectItem value="legal_guardian">{isBn ? 'আইনগত অভিভাবক (Legal Guardian)' : 'Legal Guardian'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'অভিভাবকের পেশা' : 'Guardian Occupation'} *
          </Label>
          <Input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder={isBn ? 'যেমন: শিক্ষক, চিকিৎসক, প্রকৌশলী, চাকরিজীবী, ব্যবসায়ী' : 'e.g. Service Holder, Doctor, Business'}
            required
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'আবাসিক জেলা' : 'Residential District'} *
          </Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'বাসার পূর্ণাঙ্গ এলাকা ও ঠিকানা' : 'Address & Area'} *
          </Label>
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={isBn ? 'যেমন: বাসা-১২, রোড-৪, ধানমন্ডি' : 'e.g. Road 4, Dhanmondi'}
            required
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'জরুরি যোগাযোগ নম্বর (WhatsApp / Phone)' : 'Emergency Contact Phone'} *
          </Label>
          <Input
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="+88017XXXXXXXX"
            required
            className="text-xs font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'পছন্দের যোগাযোগ ভাষা' : 'Preferred Language'}
          </Label>
          <Select
            value={preferredLocale}
            onValueChange={(val) => setPreferredLocale(val as 'bn' | 'en')}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-guardian-profile"
        >
          {isBn ? 'প্রোফাইল সংরক্ষণ করুন ও এগিয়ে যান' : 'Save Profile & Continue'}
        </Button>
      </div>
    </form>
  );
}

/** GUARDIAN STEP 2: GUARDIAN LINK / ADD CHILD STUDENT STEP FORM */
function GuardianLinkStudentStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const { data: levelsData, isLoading: loadingLevels } = useGetEducationLevelsQuery();
  const levelsList = levelsData?.data ?? [];

  const [linkMode, setLinkMode] = React.useState<'create_child' | 'link_existing'>('create_child');
  const [childName, setChildName] = React.useState('আসিফ ইকবাল (Asif Iqbal)');
  const [educationLevelId, setEducationLevelId] = React.useState('');
  const [institutionName, setInstitutionName] = React.useState('সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয় (St. Joseph)');
  const [curriculum, setCurriculum] = React.useState('Bangla Medium');
  const [relationshipType, setRelationshipType] = React.useState('father');
  const [existingContact, setExistingContact] = React.useState('');

  React.useEffect(() => {
    if (levelsList.length > 0 && !educationLevelId) {
      setEducationLevelId(levelsList[0].id);
    }
  }, [levelsList, educationLevelId]);

  function handleQuickSample() {
    setLinkMode('create_child');
    setChildName('আসিফ ইকবাল (Asif Iqbal)');
    setInstitutionName('সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয় (St. Joseph)');
    setCurriculum('Bangla Medium');
    setRelationshipType('father');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (linkMode === 'create_child') {
      onSubmit({
        childName: childName.trim(),
        educationLevelId,
        institutionName: institutionName.trim(),
        curriculum,
        relationshipType,
      });
    } else {
      onSubmit({
        studentIdentifier: existingContact.trim(),
        relationshipType,
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-guardian-link-student-form"
    >
      {/* 1-Click Realistic Test Sample Child */}
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {isBn
                ? 'এক-ক্লিকে নমুনা সন্তান / শিক্ষার্থী যুক্ত করুন (টেস্টিং ও ডেমো)'
                : '1-Click Sample Child (Testing & Demo)'}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {isBn ? 'স্বয়ংক্রিয় লিঙ্ক' : 'Auto Fill'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isBn
            ? 'সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়ের নবম শ্রেণির শিক্ষার্থী আসিফ ইকবালকে এক ক্লিকে যুক্ত করুন:'
            : 'Add realistic sample student Asif Iqbal (Class 9, St. Joseph) with 1 click:'}
        </p>
        <div className="pt-1">
          <button
            type="button"
            onClick={handleQuickSample}
            className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:bg-muted/40 transition-all text-left cursor-pointer shadow-2xs w-full sm:w-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {isBn ? 'আসিফ ইকবাল (Asif Iqbal)' : 'Asif Iqbal'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {isBn ? 'নবম শ্রেণি • সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়' : 'Class 9 • St. Joseph Higher Secondary'}
              </div>
            </div>
            <div className="ml-auto text-xs font-bold text-primary pl-4">
              {isBn ? '+ প্রিসেট লোড করুন' : '+ Load'}
            </div>
          </button>
        </div>
      </div>

      {/* Mode selection: Create new child vs Link existing */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setLinkMode('create_child')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            linkMode === 'create_child'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/50 border border-border/80 text-foreground'
          }`}
        >
          {isBn ? 'নতুন সন্তান / শিক্ষার্থী যুক্ত করুন' : 'Add New Child Student'}
        </button>
        <button
          type="button"
          onClick={() => setLinkMode('link_existing')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            linkMode === 'link_existing'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/50 border border-border/80 text-foreground'
          }`}
        >
          {isBn ? 'বিদ্যমান শিক্ষার্থীর কোড দিয়ে যুক্ত করুন' : 'Link via Existing Student ID'}
        </button>
      </div>

      {linkMode === 'create_child' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'সন্তানের পূর্ণ নাম' : 'Child Full Name'} *
              </Label>
              <Input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder={isBn ? 'যেমন: আসিফ ইকবাল' : 'e.g. Asif Iqbal'}
                required
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'সন্তানের শ্রেণি / লেভেল' : 'Class / Education Level'} *
              </Label>
              <Select
                value={educationLevelId}
                onValueChange={setEducationLevelId}
                disabled={loadingLevels}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder={isBn ? 'লেভেল নির্বাচন করুন' : 'Select level'} />
                </SelectTrigger>
                <SelectContent>
                  {levelsList.map((lvl) => (
                    <SelectItem key={lvl.id} value={lvl.id}>
                      {isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'স্কুল / শিক্ষা প্রতিষ্ঠান' : 'School / College Name'} *
              </Label>
              <Input
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder={isBn ? 'যেমন: সেন্ট জোসেফ, ভিকারুননিসা' : 'e.g. St. Joseph, Viqarunnisa'}
                required
                className="text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'কারিকুলাম মাধ্যম' : 'Curriculum Medium'}
              </Label>
              <Select value={curriculum} onValueChange={setCurriculum}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bangla Medium">{isBn ? 'বাংলা মাধ্যম (Bangla Medium)' : 'Bangla Medium'}</SelectItem>
                  <SelectItem value="English Version">{isBn ? 'ইংলিশ ভার্সন (English Version)' : 'English Version'}</SelectItem>
                  <SelectItem value="English Medium">{isBn ? 'ইংলিশ মিডিয়াম (English Medium)' : 'English Medium'}</SelectItem>
                  <SelectItem value="Madrasah">{isBn ? 'মাদ্রাসা শিক্ষা (Madrasah)' : 'Madrasah'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {isBn ? 'শিক্ষার্থীর মোবাইল নম্বর বা স্টুডেন্ট কোড' : 'Student Phone or Student Code'} *
          </Label>
          <Input
            value={existingContact}
            onChange={(e) => setExistingContact(e.target.value)}
            placeholder="+88017XXXXXXXX or STU-123456"
            required
            className="text-xs font-mono"
          />
        </div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-link-student"
        >
          {isBn ? 'শিক্ষার্থী লিংক করুন ও অনবোর্ডিং সম্পন্ন করুন' : 'Link Student & Complete Onboarding'}
        </Button>
      </div>
    </form>
  );
}


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? (result.split(',').pop() ?? '') : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

const tutorProfileSchema = z.object({
  headline: z
    .string()
    .min(5, 'ইংরেজি শিরোনাম কমপক্ষে ৫ অক্ষর হতে হবে')
    .max(100, 'ইংরেজি শিরোনাম সর্বোচ্চ ১০০ অক্ষর হতে পারে'),
  headlineBn: z
    .string()
    .min(5, 'বাংলা শিরোনাম কমপক্ষে ৫ অক্ষর হতে হবে')
    .max(100, 'বাংলা শিরোনাম সর্বোচ্চ ১০০ অক্ষর হতে পারে'),
  bio: z
    .string()
    .min(20, 'ইংরেজি পরিচিতি কমপক্ষে ২০ অক্ষর হতে হবে')
    .max(1000, 'ইংরেজি পরিচিতি সর্বোচ্চ ১০০০ অক্ষর হতে পারে'),
  bioBn: z
    .string()
    .min(20, 'বাংলা পরিচিতি কমপক্ষে ২০ অক্ষর হতে হবে')
    .max(1000, 'বাংলা পরিচিতি সর্বোচ্চ ১০০০ অক্ষর হতে পারে'),
  yearsExperience: z
    .number()
    .min(0, 'অভিজ্ঞতা ০ বা তার বেশি হতে হবে')
    .max(50, 'অভিজ্ঞতা সর্বোচ্চ ৫০ বছর হতে পারে'),
  hourlyRate: z
    .number()
    .min(100, 'ফি কমপক্ষে ১০০ টাকা হতে হবে')
    .max(20000, 'ফি সর্বোচ্চ ২০,০০০ টাকা হতে পারে'),
  teachingModes: z.array(z.string()).min(1, 'কমপক্ষে একটি পাঠদানের মাধ্যম নির্বাচন করুন'),
  gender: z.enum(['male', 'female']),
  district: z.string().min(2, 'টিউশন জেলা নির্বাচন করুন'),
  preferredAreas: z.string().min(2, 'কমপক্ষে একটি পাঠদান এলাকা লিখুন বা নির্বাচন করুন'),
});

type TutorProfileFormValues = z.infer<typeof tutorProfileSchema>;

/** 1. TUTOR PROFILE STEP FORM (REACT HOOK FORM + ZOD + SHADCN) */
function TutorProfileStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const form = useForm<TutorProfileFormValues>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      headline: 'Physics & Higher Math Specialist (Class 9-12)',
      headlineBn: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান ও উচ্চতর গণিত শিক্ষক',
      bio: 'I have over 5 years of tutoring experience in physics and mathematics with a focus on conceptual clarity and exam prep.',
      bioBn:
        'আমি গত ৫ বছর ধরে পদার্থবিজ্ঞান ও গণিতের জটিল বিষয়গুলো শিক্ষার্থীদের কাছে সহজ ও সাবলীলভাবে উপস্থাপন করে আসছি।',
      yearsExperience: 3,
      hourlyRate: 600,
      teachingModes: ['online', 'student_home'],
      gender: 'male',
      district: 'Dhaka',
      preferredAreas: 'Dhanmondi, Mohammadpur, Gulshan',
    },
    mode: 'onChange',
  });

  const teachingModes = form.watch('teachingModes') || [];

  const toggleMode = (mode: string) => {
    const updated = teachingModes.includes(mode)
      ? teachingModes.filter((m) => m !== mode)
      : [...teachingModes, mode];
    form.setValue('teachingModes', updated, { shouldValidate: true, shouldDirty: true });
  };

  const handleValidSubmit = (data: TutorProfileFormValues) => {
    onSubmit({
      headline: data.headline.trim(),
      headlineEn: data.headline.trim(),
      headlineBn: data.headlineBn.trim(),
      bio: data.bio.trim(),
      bioEn: data.bio.trim(),
      bioBn: data.bioBn.trim(),
      yearsExperience: data.yearsExperience,
      hourlyRate: data.hourlyRate,
      hourlyRateMinor: String(Math.round(data.hourlyRate * 100)),
      teachingModes: data.teachingModes,
      gender: data.gender,
      district: data.district.trim(),
      preferredAreas: data.preferredAreas
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValidSubmit)}
        className="flex flex-col gap-5 text-left w-full"
        data-testid="onboarding-tutor-profile-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn ? 'পেশাদার শিরোনাম (ইংরেজি)' : 'Headline (English)'} *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 90
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 100
                  </span>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={100}
                    placeholder="e.g. Physics & Higher Math Specialist"
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="headlineBn"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn ? 'পেশাদার শিরোনাম (বাংলা)' : 'Headline (Bangla)'} *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 90
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 100
                  </span>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={100}
                    placeholder="নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান ও উচ্চতর গণিত শিক্ষক"
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn
                      ? 'বিস্তারিত পরিচিতি (ইংরেজি - কমপক্ষে ২০ অক্ষর)'
                      : 'Biography (English - min 20 chars)'}{' '}
                    *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 950
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 1000
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    maxLength={1000}
                    placeholder="I have over 5 years of tutoring experience in physics and mathematics..."
                    className="text-xs resize-y"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bioBn"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn
                      ? 'বিস্তারিত পরিচিতি (বাংলা - কমপক্ষে ২০ অক্ষর)'
                      : 'Biography (Bangla - min 20 chars)'}{' '}
                    *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 950
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 1000
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    maxLength={1000}
                    placeholder="আমি গত ৫ বছর ধরে শিক্ষার্থীদের পদার্থবিজ্ঞান ও গণিত সহজ পদ্ধতিতে পাঠদান করছি..."
                    className="text-xs resize-y"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'শিক্ষকের জেন্ডার / লিঙ্গ' : 'Tutor Gender'} *
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder={isBn ? 'জেন্ডার নির্বাচন করুন' : 'Select gender'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{isBn ? 'পুরুষ শিক্ষক (Male)' : 'Male'}</SelectItem>
                    <SelectItem value="female">{isBn ? 'নারী শিক্ষক (Female)' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'টিউশন জেলা' : 'Tuition District'} *
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder={isBn ? 'জেলা নির্বাচন করুন' : 'Select district'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferredAreas"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'পছন্দের পাঠদান এলাকাসমূহ' : 'Preferred Tuition Areas'} *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={isBn ? 'যেমন: ধানমন্ডি, মোহাম্মদপুর, গুলশান' : 'e.g. Dhanmondi, Gulshan'}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="yearsExperience"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'অভিজ্ঞতার বছর' : 'Years of Experience'} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'বেসিক ঘণ্টা প্রতি ফি (টাকা / ঘণ্টা)' : 'Base Hourly Rate (BDT / hr)'} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={100}
                    max={20000}
                    step={50}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* Teaching Modes Selection */}
        <div className="flex flex-col gap-2 pt-1">
          <FormLabel className="text-xs font-semibold text-foreground">
            {isBn ? 'পাঠদানের মাধ্যমসমূহ' : 'Teaching Modes'} *
          </FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'online', labelBn: 'অনলাইন ক্লাস', labelEn: 'Online Class', icon: Laptop },
              { id: 'student_home', labelBn: 'শিক্ষার্থীর বাসা', labelEn: 'Student Home', icon: Home },
              { id: 'tutor_home', labelBn: 'শিক্ষকের স্থান', labelEn: 'Tutor Place', icon: MapPin },
            ].map((mode) => {
              const isSelected = teachingModes.includes(mode.id);
              const ModeIcon = mode.icon;
              return (
                <div
                  key={mode.id}
                  onClick={() => toggleMode(mode.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-foreground shadow-2xs font-semibold'
                      : 'border-border/60 bg-card hover:border-border hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ModeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs block font-medium">
                      {isBn ? mode.labelBn : mode.labelEn}
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
          {form.formState.errors.teachingModes && (
            <p className="text-[11px] text-destructive font-medium">
              {form.formState.errors.teachingModes.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            size="default"
            className="w-full sm:w-auto font-bold px-8 h-11"
            data-testid="onboarding-submit-profile"
          >
            {isBn ? 'প্রোফাইল সংরক্ষণ করুন' : 'Save Profile & Continue'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const tutorEducationSchema = z.object({
  title: z
    .string()
    .min(3, 'ডিগ্রির নাম কমপক্ষে ৩ অক্ষর হতে হবে')
    .max(120, 'ডিগ্রির নাম সর্বোচ্চ ১২০ অক্ষর হতে পারে'),
  type: z.string().min(2, 'সনদের ধরন নির্বাচন করুন'),
  institution: z
    .string()
    .min(3, 'প্রতিষ্ঠানের নাম কমপক্ষে ৩ অক্ষর হতে হবে')
    .max(150, 'প্রতিষ্ঠানের নাম সর্বোচ্চ ১৫০ অক্ষর হতে পারে'),
  issuedYear: z
    .number()
    .min(1970, 'সন ১৯৭০ বা তার পরবর্তী হতে হবে')
    .max(2030, 'সন ২০৩০ এর মধ্যে হতে হবে'),
});

type TutorEducationFormValues = z.infer<typeof tutorEducationSchema>;

/** 2. TUTOR EDUCATION STEP FORM (REACT HOOK FORM + ZOD + SHADCN) */
function TutorEducationStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const form = useForm<TutorEducationFormValues>({
    resolver: zodResolver(tutorEducationSchema),
    defaultValues: {
      title: 'বি.এসসি ইন কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং (B.Sc in CSE)',
      type: 'degree',
      institution: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (BUET)',
      issuedYear: 2023,
    },
    mode: 'onChange',
  });

  const handleValidSubmit = (data: TutorEducationFormValues) => {
    onSubmit({
      degree: data.title.trim(),
      title: data.title.trim(),
      type: data.type,
      institution: data.institution.trim(),
      passingYear: data.issuedYear,
      qualifications: [
        {
          title: data.title.trim(),
          type: data.type,
          institution: data.institution.trim(),
          issuedYear: data.issuedYear,
        },
      ],
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValidSubmit)}
        className="flex flex-col gap-5 text-left w-full"
        data-testid="onboarding-tutor-education-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn ? 'ডিগ্রি / সনদের নাম' : 'Degree / Qualification Title'} *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 110
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 120
                  </span>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={120}
                    placeholder={isBn ? 'যেমন: বি.এসসি ইন পদার্থবিজ্ঞান' : 'e.g. B.Sc. in Physics'}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'সনদের ধরন' : 'Qualification Type'} *
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="degree">
                      {isBn ? 'বিশ্ববিদ্যালয় ডিগ্রি (Bachelor / Master)' : 'University Degree'}
                    </SelectItem>
                    <SelectItem value="academic_certificate">
                      {isBn ? 'এইচএসসি / এসএসসি সনদ' : 'HSC / SSC Certificate'}
                    </SelectItem>
                    <SelectItem value="professional_certification">
                      {isBn ? 'পেশাগত শিক্ষকতা সার্টিফিকেট' : 'Professional Certification'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    {isBn ? 'শিক্ষা প্রতিষ্ঠান / বোর্ড' : 'Institution / Board'} *
                  </FormLabel>
                  <span
                    className={`text-[11px] font-mono ${
                      (field.value?.length || 0) > 140
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0} / 150
                  </span>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={150}
                    placeholder={isBn ? 'যেমন: ঢাকা বিশ্ববিদ্যালয়' : 'e.g. University of Dhaka'}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issuedYear"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'পাসের সাল (Passing Year)' : 'Passing Year'} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1970}
                    max={2030}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            size="default"
            className="w-full sm:w-auto font-bold px-8 h-11"
            data-testid="onboarding-submit-education"
          >
            {isBn ? 'যোগ্যতা সংরক্ষণ করুন' : 'Save Education & Continue'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** 3. TUTOR SUBJECTS STEP FORM */
function TutorSubjectsStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const { data: subjectsData, isLoading: loadingSubjects } = useGetSubjectsQuery();
  const { data: levelsData, isLoading: loadingLevels } = useGetEducationLevelsQuery();

  const subjectsList = subjectsData?.data ?? [];
  const levelsList = levelsData?.data ?? [];

  const [selectedSubjectId, setSelectedSubjectId] = React.useState('');
  const [selectedLevelId, setSelectedLevelId] = React.useState('');
  const [rate, setRate] = React.useState('500');

  const [addedSubjects, setAddedSubjects] = React.useState<
    Array<{
      subjectId: string;
      subjectName: string;
      educationLevelId: string;
      levelName: string;
      rate: number;
    }>
  >([]);

  React.useEffect(() => {
    if (subjectsList.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjectsList[0].id);
    }
  }, [subjectsList, selectedSubjectId]);

  React.useEffect(() => {
    if (levelsList.length > 0 && !selectedLevelId) {
      setSelectedLevelId(levelsList[0].id);
    }
  }, [levelsList, selectedLevelId]);

  function handleAddSubject() {
    if (!selectedSubjectId || !selectedLevelId) return;

    const sub = subjectsList.find((s) => s.id === selectedSubjectId);
    const lvl = levelsList.find((l) => l.id === selectedLevelId);
    if (!sub || !lvl) return;

    if (
      addedSubjects.some(
        (item) => item.subjectId === selectedSubjectId && item.educationLevelId === selectedLevelId,
      )
    ) {
      return;
    }

    setAddedSubjects((prev) => [
      ...prev,
      {
        subjectId: sub.id,
        subjectName: isBn ? sub.nameBn || sub.nameEn : sub.nameEn,
        educationLevelId: lvl.id,
        levelName: isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn,
        rate: Number(rate) || 500,
      },
    ]);
  }

  function handleRemoveSubject(idx: number) {
    setAddedSubjects((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (addedSubjects.length === 0) return;

    onSubmit({
      subjects: addedSubjects.map((item) => ({
        subjectId: item.subjectId,
        educationLevelId: item.educationLevelId,
        hourlyRateMinor: String(item.rate * 100),
      })),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-tutor-subjects-form"
    >
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 flex flex-col gap-3.5">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>{isBn ? 'নতুন পাঠদান বিষয় নির্বাচন করুন' : 'Add Teaching Subject'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'বিষয়' : 'Subject'} *</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={loadingSubjects}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder={isBn ? 'বিষয় নির্বাচন করুন' : 'Select subject'} />
              </SelectTrigger>
              <SelectContent>
                {subjectsList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {isBn ? s.nameBn || s.nameEn : s.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">
              {isBn ? 'শ্রেণি / লেভেল' : 'Class / Level'} *
            </Label>
            <Select
              value={selectedLevelId}
              onValueChange={setSelectedLevelId}
              disabled={loadingLevels}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder={isBn ? 'লেভেল নির্বাচন করুন' : 'Select level'} />
              </SelectTrigger>
              <SelectContent>
                {levelsList.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {isBn ? l.nameBn || l.nameEn : l.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">
              {isBn ? 'ঘণ্টা প্রতি ফি (টাকা)' : 'Rate / hr (BDT)'} *
            </Label>
            <Input
              type="number"
              min={100}
              max={10000}
              step={50}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="button"
            onClick={handleAddSubject}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto text-xs font-bold gap-1.5"
            data-testid="onboarding-add-subject-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isBn ? 'বিষয় যুক্ত করুন' : '+ Add Subject'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold text-foreground">
          {isBn
            ? `নির্বাচিত পাঠদান বিষয়সমূহ (${addedSubjects.length})`
            : `Selected Teaching Subjects (${addedSubjects.length})`}
        </Label>
        {addedSubjects.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground bg-card/40">
            {isBn
              ? 'এখনও কোনো বিষয় যুক্ত করা হয়নি। উপরের ড্রপডাউন থেকে বিষয় ও শ্রেণি নির্বাচন করে "বিষয় যুক্ত করুন" বাটনে ক্লিক করুন।'
              : 'No subjects added yet. Pick subject and level from above and click "+ Add Subject".'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {addedSubjects.map((item, idx) => (
              <div
                key={`${item.subjectId}-${item.educationLevelId}-${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card text-xs shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-foreground truncate">{item.subjectName}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span>{item.levelName}</span>
                    <span>•</span>
                    <span className="font-semibold text-primary">৳{item.rate}/hr</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(idx)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={addedSubjects.length === 0 || isSubmitting}
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-subjects"
        >
          {isBn ? 'বিষয়সমূহ সংরক্ষণ করুন' : 'Save Subjects & Continue'}
        </Button>
      </div>
    </form>
  );
}

/** 4. TUTOR AVAILABILITY STEP FORM */
function TutorAvailabilityStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const WEEKDAYS = [
    { id: 0, bn: 'রবিবার', en: 'Sunday' },
    { id: 1, bn: 'সোমবার', en: 'Monday' },
    { id: 2, bn: 'মঙ্গলবার', en: 'Tuesday' },
    { id: 3, bn: 'বুধবার', en: 'Wednesday' },
    { id: 4, bn: 'বৃহস্পতিবার', en: 'Thursday' },
    { id: 5, bn: 'শুক্রবার', en: 'Friday' },
    { id: 6, bn: 'শনিবার', en: 'Saturday' },
  ];

  const [selectedDay, setSelectedDay] = React.useState(0);
  const [startLocal, setStartLocal] = React.useState('09:00');
  const [endLocal, setEndLocal] = React.useState('18:00');

  const [slots, setSlots] = React.useState<
    Array<{ weekday: number; startLocal: string; endLocal: string }>
  >([
    { weekday: 0, startLocal: '09:00', endLocal: '18:00' },
    { weekday: 1, startLocal: '09:00', endLocal: '18:00' },
    { weekday: 2, startLocal: '09:00', endLocal: '18:00' },
    { weekday: 3, startLocal: '09:00', endLocal: '18:00' },
    { weekday: 4, startLocal: '09:00', endLocal: '18:00' },
  ]);

  function handleAddSlot() {
    if (
      slots.some(
        (s) => s.weekday === selectedDay && s.startLocal === startLocal && s.endLocal === endLocal,
      )
    ) {
      return;
    }
    setSlots((prev) => [...prev, { weekday: selectedDay, startLocal, endLocal }]);
  }

  function handleRemoveSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function applyPreset(presetType: 'weekdays' | 'evening' | 'all') {
    if (presetType === 'weekdays') {
      setSlots(
        [0, 1, 2, 3, 4].map((d) => ({ weekday: d, startLocal: '09:00', endLocal: '18:00' })),
      );
    } else if (presetType === 'evening') {
      setSlots(
        [0, 1, 2, 3, 4].map((d) => ({ weekday: d, startLocal: '18:00', endLocal: '21:00' })),
      );
    } else if (presetType === 'all') {
      setSlots(
        [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, startLocal: '10:00', endLocal: '20:00' })),
      );
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slots.length === 0) return;
    onSubmit({ slots });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-tutor-availability-form"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          {isBn ? 'কুইক প্রিসেট:' : 'Quick Presets:'}
        </span>
        <button
          type="button"
          onClick={() => applyPreset('weekdays')}
          className="px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
        >
          {isBn ? 'কার্যদিবস (রবি-বৃহ ০৯-১৮)' : 'Weekdays (09-18)'}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('evening')}
          className="px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
        >
          {isBn ? 'সন্ধ্যা ব্যাচ (১৮-২১)' : 'Evening (18-21)'}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('all')}
          className="px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
        >
          {isBn ? 'সকল দিন (১০-২০)' : 'All 7 Days (10-20)'}
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'বার' : 'Weekday'}</Label>
            <Select
              value={String(selectedDay)}
              onValueChange={(val) => setSelectedDay(Number(val))}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {isBn ? d.bn : d.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'শুরু' : 'Start Time'}</Label>
            <Input
              type="time"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="text-xs h-10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'সমাপ্তি' : 'End Time'}</Label>
            <Input
              type="time"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="text-xs h-10"
            />
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="button"
            onClick={handleAddSlot}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto text-xs font-bold gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isBn ? 'স্লট যুক্ত করুন' : 'Add Time Slot'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold text-foreground">
          {isBn
            ? `সক্রিয় প্রাপ্যতা সময়সূচি (${slots.length})`
            : `Active Weekly Slots (${slots.length})`}
        </Label>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {slots.map((s, idx) => {
            const dayName = isBn
              ? WEEKDAYS.find((d) => d.id === s.weekday)?.bn
              : WEEKDAYS.find((d) => d.id === s.weekday)?.en;
            return (
              <div
                key={`${s.weekday}-${s.startLocal}-${s.endLocal}-${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-foreground block">{dayName}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {s.startLocal} – {s.endLocal}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(idx)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={slots.length === 0 || isSubmitting}
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-availability"
        >
          {isBn ? 'সময়সূচি সংরক্ষণ করুন' : 'Save Schedule & Continue'}
        </Button>
      </div>
    </form>
  );
}

/** 5. TUTOR DOCUMENTS STEP FORM (REACT HOOK FORM + MULTI-DOC + SAMPLE DOC PICKER + SHADCN) */
interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  previewUrl?: string;
}

const SAMPLE_DOCS = [
  {
    name: 'nid-front.png',
    titleBn: 'জাতীয় পরিচয়পত্র (সামনে)',
    titleEn: 'National ID (Front)',
    type: 'nid_front',
    path: '/sample-documents/nid-front.png',
  },
  {
    name: 'nid-back.png',
    titleBn: 'জাতীয় পরিচয়পত্র (পেছনে)',
    titleEn: 'National ID (Back)',
    type: 'nid_back',
    path: '/sample-documents/nid-back.png',
  },
  {
    name: 'buet-certificate.png',
    titleBn: 'বুয়েট বি.এসসি ডিগ্রি সনদ',
    titleEn: 'BUET B.Sc Degree Certificate',
    type: 'academic_certificate',
    path: '/sample-documents/buet-certificate.png',
  },
  {
    name: 'buet-id-card.png',
    titleBn: 'বুয়েট ফ্যাকাল্টি/স্টুডেন্ট আইডি',
    titleEn: 'BUET Faculty/Student ID',
    type: 'institution_letter',
    path: '/sample-documents/buet-id-card.png',
  },
];

function DocumentsStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const [uploadEvidence, { isLoading: uploading }] = useUploadEvidenceMutation();
  const [documentType, setDocumentType] = React.useState('nid');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedDocument[]>([]);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadingSample, setUploadingSample] = React.useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const acceptedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedMime.includes(file.type)) {
      setUploadError(
        isBn
          ? 'অনুগ্রহ করে PDF, JPEG, PNG বা WEBP ফাইল নির্বাচন করুন।'
          : 'Please choose a PDF, JPEG, PNG or WEBP file.',
      );
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const res = await uploadEvidence({
        purpose:
          documentType === 'degree'
            ? 'degree'
            : documentType === 'nid'
              ? 'nid'
              : 'tutor_verification_evidence',
        originalFilename: file.name,
        mediaType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
        sizeBytes: file.size,
        contentBase64: base64,
      }).unwrap();

      if (res.file) {
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: res.file.id,
            name: file.name,
            type: documentType,
            sizeBytes: file.size,
            previewUrl: file.type.startsWith('image/') ? base64 : undefined,
          },
        ]);
      }
    } catch {
      setUploadError(isBn ? 'ফাইল আপলোড করতে সমস্যা হয়েছে।' : 'Failed to upload file.');
    }
  }

  async function handleLoadSample(sample: (typeof SAMPLE_DOCS)[0]) {
    setUploadError(null);
    setUploadingSample(sample.name);
    try {
      const resp = await fetch(sample.path);
      const blob = await resp.blob();
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await uploadEvidence({
        purpose:
          sample.type === 'degree'
            ? 'degree'
            : sample.type === 'nid'
              ? 'nid'
              : 'tutor_verification_evidence',
        originalFilename: sample.name,
        mediaType: 'image/png',
        sizeBytes: blob.size,
        contentBase64: base64,
      }).unwrap();

      if (res.file) {
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: res.file.id,
            name: sample.name,
            type: sample.type,
            sizeBytes: blob.size,
            previewUrl: base64,
          },
        ]);
      }
    } catch {
      setUploadError(
        isBn ? 'নমুনা নথি আপলোড করতে সমস্যা হয়েছে।' : 'Failed to load sample document.',
      );
    } finally {
      setUploadingSample(null);
    }
  }

  function handleRemove(idx: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploadedFiles.length === 0) {
      setUploadError(
        isBn
          ? 'অনুগ্রহ করে কমপক্ষে একটি প্রমাণপত্র নথি যুক্ত করুন।'
          : 'Please add at least one evidence document.',
      );
      return;
    }
    onSubmit({
      fileAssetId: uploadedFiles[0].id,
      documentType: uploadedFiles[0].type,
      documents: uploadedFiles.map((doc) => ({
        fileAssetId: doc.id,
        documentType: doc.type,
      })),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-documents-form"
    >
      {/* 1-Click Realistic Test Documents Selection */}
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {isBn
                ? 'এক-ক্লিকে নমুনা ভেরিফিকেশন নথি যুক্ত করুন (পরীক্ষা ও ডেমোর জন্য)'
                : '1-Click Sample Documents (For Testing & Demo)'}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {isBn ? 'স্বয়ংক্রিয় ক্লাউড আপলোড' : 'Instant Cloud Upload'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isBn
            ? 'আমাদের সিস্টেমে জেনারেট করা বাস্তবসম্মত সরকারি স্মার্ট এনআইডি এবং বুয়েট ডিগ্রি সনদপত্র সরাসরি যুক্ত করুন:'
            : 'Add realistic Bangladesh Smart NID and BUET degree certificates directly:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {SAMPLE_DOCS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => handleLoadSample(sample)}
              disabled={uploadingSample === sample.name || uploading}
              className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:bg-muted/40 transition-all text-left group cursor-pointer shadow-2xs"
            >
              <img
                src={sample.path}
                alt={sample.name}
                className="w-12 h-10 object-cover rounded-lg border border-border shrink-0 shadow-2xs"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {isBn ? sample.titleBn : sample.titleEn}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="uppercase font-mono">{sample.type}</span>
                  <span>•</span>
                  <span className="text-primary font-medium">
                    {uploadingSample === sample.name
                      ? isBn
                        ? 'আপলোড হচ্ছে...'
                        : 'Uploading...'
                      : isBn
                        ? '+ যোগ করুন'
                        : '+ Add'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual File Upload */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 flex flex-col gap-4">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span>{isBn ? 'আপনার নিজস্ব ফাইল আপলোড করুন' : 'Or Upload Your Own Document'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'নথির ধরন' : 'Document Type'} *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nid">{isBn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}</SelectItem>
                <SelectItem value="degree">
                  {isBn ? 'বিশ্ববিদ্যালয় ডিগ্রি সনদ' : 'University Degree Certificate'}
                </SelectItem>
                <SelectItem value="student_id">
                  {isBn ? 'শিক্ষার্থী / শিক্ষক আইডি কার্ড' : 'Student / Faculty ID'}
                </SelectItem>
                <SelectItem value="other">{isBn ? 'অন্যান্য প্রমাণপত্র' : 'Other Evidence'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{isBn ? 'ফাইল নির্বাচন করুন' : 'Choose File'} *</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer"
            />
          </div>
        </div>

        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      </div>

      {/* Uploaded Documents List */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold text-foreground">
          {isBn
            ? `সংযুক্ত ভেরিফিকেশন প্রমাণপত্র (${uploadedFiles.length})`
            : `Attached Verification Documents (${uploadedFiles.length})`}
        </Label>
        {uploadedFiles.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground bg-card/40">
            {isBn
              ? 'এখনও কোনো ভেরিফিকেশন নথি যুক্ত করা হয়নি। ১-ক্লিক নমুনা থেকে যোগ করুন বা আপনার নিজস্ব ফাইল আপলোড করুন।'
              : 'No documents attached yet. Click a sample document above or upload your own file.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploadedFiles.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card text-xs shadow-2xs"
              >
                {doc.previewUrl ? (
                  <img
                    src={doc.previewUrl}
                    alt={doc.name}
                    className="w-12 h-10 object-cover rounded-lg border border-border shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground truncate">{doc.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="uppercase font-mono">{doc.type}</span>
                    <span>•</span>
                    <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600">
                      Supabase Cloud
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={uploadedFiles.length === 0 || uploading || isSubmitting}
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-documents"
        >
          {isBn ? 'নথি সংরক্ষণ ও পরবর্তী ধাপ' : 'Save Documents & Continue'}
        </Button>
      </div>
    </form>
  );
}

/** 6. SECURITY SETUP STEP FORM */
function SecuritySetupStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';
  const [agreed, setAgreed] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    onSubmit({ acknowledgePolicy: true });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-security-form"
    >
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
          <Shield className="h-4 w-4 text-primary" />
          <span>{isBn ? 'নিরাপত্তা ও নৈতিক আচরণবিধি' : 'Security & Code of Conduct'}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isBn
            ? 'অগ্রণী এডু প্ল্যাটফর্মে শিক্ষক হিসেবে আপনি সকল শিক্ষার্থীর নিরাপত্তা, পেশাদারিত্ব ও সততা রক্ষা করতে অঙ্গীকারবদ্ধ। কোনো মিথ্যা তথ্য প্রদান বা বিভ্রান্তিকর নথি আপলোড করলে অ্যাকাউন্ট আজীবন স্থগিত হতে পারে।'
            : 'As an educator on OgroniEdu, you commit to student safety, professionalism, and academic integrity. Submitting false info or invalid credentials will lead to permanent suspension.'}
        </p>
        <label className="flex items-center gap-2.5 cursor-pointer pt-2 select-none">
          <Checkbox
            id="acknowledgePolicy"
            checked={agreed}
            onCheckedChange={(c) => setAgreed(Boolean(c))}
          />
          <span className="text-xs font-semibold text-foreground">
            {isBn
              ? 'আমি প্ল্যাটফর্মের সমস্ত নীতিমালা ও নিরাপত্তা শর্তাবলী মেনে নিচ্ছি'
              : 'I acknowledge and accept all terms of service and security policies'}
          </span>
        </label>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={!agreed || isSubmitting}
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-security"
        >
          {isBn ? 'স্বীকারোক্তি সম্পন্ন করুন' : 'Confirm & Proceed'}
        </Button>
      </div>
    </form>
  );
}

/** 7. REVIEW STEP FORM */
function ReviewStepForm({
  locale,
  onSubmit,
  isSubmitting,
}: {
  locale: Locale;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const isBn = locale === 'bn';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ confirmed: true });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 text-left w-full"
      data-testid="onboarding-review-form"
    >
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Sparkles className="h-5 w-5" />
          <span>
            {isBn ? 'সকল তথ্য চূড়ান্ত নিরীক্ষা' : 'Final Review & Verification Submission'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isBn
            ? 'আপনি সফলভাবে আপনার প্রোফাইল, শিক্ষাগত যোগ্যতা, পাঠদান বিষয়সমূহ, সাপ্তাহিক সময়সূচি ও ভেরিফিকেশন নথি যুক্ত করেছেন। জমা দেওয়ার পর আমাদের অ্যাডমিন টিম এগুলো যাচাই করবে।'
            : 'You have entered your profile, qualifications, subjects, weekly availability, and verification documents. Submit now for administrator review.'}
        </p>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          size="default"
          className="w-full sm:w-auto font-bold px-8 h-11"
          data-testid="onboarding-submit-review"
        >
          {isBn ? 'যাচাইকরণের জন্য জমা দিন' : 'Submit for Verification'}
        </Button>
      </div>
    </form>
  );
}

function ContactVerificationCard({
  locale,
  userContact,
  onVerified,
}: {
  locale: Locale;
  userContact?: string;
  onVerified: () => void;
}) {
  const isBn = locale === 'bn';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const [code, setCode] = React.useState(STATIC_DEV_OTP);
  const [codeSent, setCodeSent] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(
    isBn ? `স্ট্যাটিক ওটিপি কোড (${STATIC_DEV_OTP}) স্বয়ংক্রিয়ভাবে সক্রিয় রয়েছে।` : `Static OTP (${STATIC_DEV_OTP}) is pre-configured for verification.`,
  );
  const [error, setError] = React.useState<string | null>(null);

  async function handleSendCode() {
    if (!userContact) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: userContact, purpose: 'contact_verification' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodeSent(true);
        setCode(data.debugCode || STATIC_DEV_OTP);
        setFeedback(
          isBn
            ? `যাচাই কোড পাঠানো হয়েছে (কোড: ${data.debugCode || STATIC_DEV_OTP})`
            : `Verification code sent (Code: ${data.debugCode || STATIC_DEV_OTP})`,
        );
      } else {
        setError(data?.error?.message || 'Failed to send code');
      }
    } catch {
      setError(isBn ? 'কোড পাঠাতে ব্যর্থ হয়েছে।' : 'Network error');
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode(e?: React.FormEvent, customCode?: string) {
    if (e) e.preventDefault();
    const codeToVerify = customCode || code || STATIC_DEV_OTP;
    if (!userContact || !codeToVerify.trim()) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: userContact,
          code: codeToVerify.trim(),
          purpose: 'contact_verification',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onVerified();
      } else {
        setError(data?.error?.message || 'Invalid code');
      }
    } catch {
      setError(isBn ? 'যাচাই করতে সমস্যা হয়েছে।' : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 sm:p-6 flex flex-col gap-4 text-left shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-border/40">
        <div>
          <span className="text-xs font-bold text-foreground block">
            {isBn ? 'যোগাযোগ নম্বর / ইমেইল যাচাইকরণ' : 'Contact Verification'}
          </span>
          <span className="text-[11px] text-muted-foreground">{userContact}</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto border-primary/30 text-primary bg-primary/5">
          OTP Bypass ({STATIC_DEV_OTP})
        </Badge>
      </div>

      <form onSubmit={(e) => handleVerifyCode(e)} className="flex flex-col gap-3.5 pt-1">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {isBn ? 'যাচাইকরণ ওটিপি কোড (OTP Code)' : 'Verification OTP Code'}
          </label>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={STATIC_DEV_OTP}
              maxLength={6}
              className="text-sm font-mono tracking-widest text-center h-10"
              data-testid="onboarding-otp-input"
            />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={handleSendCode}
              isLoading={isSending}
              className="text-xs shrink-0 h-10 px-4 font-semibold"
            >
              {isBn ? 'পুনরায় কোড' : 'Resend'}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isVerifying}
          size="default"
          className="w-full text-xs font-bold gap-2 h-11"
          data-testid="onboarding-otp-submit"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isBn ? `ওটিপি যাচাই করুন (${STATIC_DEV_OTP})` : `Verify OTP (${STATIC_DEV_OTP})`}</span>
        </Button>
      </form>

      {feedback && <p className="text-[11px] text-primary font-medium">{feedback}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function OnboardingPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, error, refetch } = useGetMyOnboardingQuery();
  const [completeStep, { isLoading: isSubmitting }] = useCompleteOnboardingStepMutation();
  const [formError, setFormError] = React.useState<string | null>(null);

  async function handleSubmit(payload: Record<string, unknown>) {
    if (!data?.nextStep) return;
    setFormError(null);
    try {
      await completeStep({ stepKey: data.nextStep, payload }).unwrap();
      dispatch(
        enqueueToast({
          title: isBn ? 'ধাপ সংরক্ষিত হয়েছে' : 'Step saved',
          message: isBn
            ? 'অনবোর্ডিং অগ্রগতি সফলভাবে সংরক্ষণ করা হয়েছে।'
            : 'Your onboarding progress was saved.',
          type: 'success',
        }),
      );
      refetch();
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/40 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10" data-testid="onboarding-error">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription role="alert">
            {isBn
              ? 'অনবোর্ডিং অবস্থা লোড করা যায়নি। পরে আবার চেষ্টা করুন।'
              : 'Could not load onboarding status. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const steps = data.steps;
  const nextStep = steps.find((step) => step.key === data.nextStep) ?? null;
  const currentStepIndex = nextStep ? steps.findIndex((s) => s.key === nextStep.key) : steps.length;
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" data-testid="onboarding-page">
      {/* Modern Responsive Sticky Stepper Topbar */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-xs transition-all">
        {/* Top Info Row */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3">
          {/* Left: Role Track Badge & Active Step */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold tracking-wide shrink-0">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <span>{isBn ? data.roleLabelBn : data.roleLabelEn}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              {nextStep
                ? `${isBn ? 'ধাপ' : 'Step'} ${currentStepIndex + 1}/${steps.length}: ${isBn ? nextStep.titleBn : nextStep.titleEn}`
                : isBn
                  ? 'অনবোর্ডিং চূড়ান্ত নিরীক্ষা'
                  : 'Onboarding Review'}
            </span>
          </div>

          {/* Right: Progress Indicator with Percent Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 text-foreground text-xs font-mono font-bold">
              <span className="text-[11px] font-medium text-muted-foreground hidden xs:inline">
                {isBn ? 'অগ্রগতি:' : 'Progress:'}
              </span>
              <span className="text-primary font-bold" data-testid="onboarding-progress">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Connected Timeline Stepper (md and up) */}
        <div className="hidden md:block max-w-4xl mx-auto px-6 pb-3 pt-1">
          <div className="relative flex items-center justify-between">
            {/* Connecting Track Line behind nodes */}
            <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-0.5 bg-border/50 -z-10" />
            <div
              className="absolute left-6 top-4 -translate-y-1/2 h-0.5 bg-primary -z-10 transition-all duration-500 ease-out"
              style={{
                width: `${steps.length > 1 ? Math.min(100, (completedCount / (steps.length - 1)) * 100) : 0}%`,
              }}
            />

            {/* Step Nodes */}
            {steps.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.key === data.nextStep;
              const isUnderReview = step.status === 'pending_review';
              const StepNodeIcon = getStepIcon(step.key);

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center group relative cursor-default select-none"
                >
                  {/* Node Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isCurrent
                          ? 'bg-background border-2 border-primary text-primary ring-4 ring-primary/20 scale-110 shadow-xs'
                          : isUnderReview
                            ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-600'
                            : 'bg-card border-2 border-border/80 text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
                    ) : isCurrent ? (
                      <StepNodeIcon className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <span className="font-mono text-[11px]">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step Title below */}
                  <span
                    className={`mt-1.5 text-[11px] whitespace-nowrap text-center transition-colors max-w-[90px] truncate ${
                      isCurrent
                        ? 'font-bold text-primary'
                        : isCompleted
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {isBn ? step.titleBn : step.titleEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Responsive Stepper (< md) */}
        <div className="md:hidden max-w-4xl mx-auto px-4 pb-2.5 pt-1 flex flex-col gap-1.5">
          {/* Micro progress line */}
          <Progress value={progress} className="h-1 w-full rounded-full" />

          {/* Horizontal Swipeable Pill Stepper */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {steps.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.key === data.nextStep;
              const StepNodeIcon = getStepIcon(step.key);

              return (
                <div
                  key={step.key}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all select-none ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : isCompleted
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-primary stroke-[3]" />
                  ) : (
                    <StepNodeIcon
                      className={`w-3 h-3 ${isCurrent ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                    />
                  )}
                  <span className="whitespace-nowrap">{isBn ? step.titleBn : step.titleEn}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Form Content Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {formError && (
          <Alert
            variant="destructive"
            className="mb-6 rounded-2xl"
            data-testid="onboarding-form-error"
          >
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {nextStep && !data.isComplete && (
          <section className="bg-card border border-border/50 shadow-xs sm:shadow-sm rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 transition-all">
            {/* Step Card Title Header */}
            <div className="flex items-start sm:items-center gap-3.5 border-b border-border/40 pb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                {React.createElement(getStepIcon(nextStep.key), {
                  className: 'w-5 h-5 sm:w-6 sm:h-6',
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {isBn ? nextStep.titleBn : nextStep.titleEn}
                  </h2>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/5 text-primary">
                    {isBn ? `ধাপ ${currentStepIndex + 1}` : `Step ${currentStepIndex + 1}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {nextStep.key === 'contact_verification'
                    ? isBn
                      ? 'আপনার মোবাইল নম্বর বা ইমেইল ওটিপি দিয়ে যাচাই করুন।'
                      : 'Verify your contact phone number or email using the OTP verification code.'
                    : nextStep.key === 'profile'
                      ? isBn
                        ? 'আপনার পেশাদার পরিচয়, অভিজ্ঞতা, টিউশন এলাকা ও ফি নির্ধারণ করুন।'
                        : 'Provide your professional headline, bio, location, and hourly rate.'
                      : nextStep.key === 'education'
                        ? isBn
                          ? 'আপনার সর্বোচ্চ শিক্ষাগত ডিগ্রি ও শিক্ষা প্রতিষ্ঠানের তথ্য যোগ করুন।'
                          : 'Add your university degree, institution, and graduation year.'
                        : nextStep.key === 'subjects'
                          ? isBn
                            ? 'যেসব বিষয় ও ক্লাসে পাঠদান করতে চান তা নির্বাচন করুন।'
                            : 'Select your preferred subjects and education levels.'
                          : nextStep.key === 'availability'
                            ? isBn
                              ? 'সপ্তাহে যে দিনগুলোতে আপনি টিউশন করাতে পারবেন তা নির্বাচন করুন।'
                              : 'Set the days and time slots when you are available to teach.'
                            : nextStep.key === 'documents'
                              ? isBn
                                ? 'আপনার জাতীয় পরিচয়পত্র ও ডিগ্রি সনদপত্র সরাসরি আপলোড করুন (Supabase ক্লাউড স্টোরেজে সংরক্ষিত হবে)।'
                                : 'Upload authentic NID and academic certificates directly to Supabase storage.'
                              : nextStep.key === 'learning_preferences'
                                ? isBn
                                  ? 'পছন্দের বিষয়, পাঠদানের মাধ্যম, জেন্ডার ও বাজেট নির্ধারণ করুন।'
                                  : 'Choose your preferred subjects, learning modes, tutor gender, and hourly budget.'
                              : nextStep.key === 'link_student'
                                ? isBn
                                  ? 'আপনার দায়িত্বপ্রাপ্ত সন্তান বা শিক্ষার্থীর তথ্য যুক্ত করুন।'
                                  : 'Link or add the student you are responsible for.'
                              : isBn
                                ? 'প্রয়োজনীয় তথ্য পূরণ করে পরবর্তী ধাপে এগিয়ে যান।'
                                : 'Complete the required information to proceed.'}
                </p>
              </div>
            </div>

            {/* Active Step Form View */}
            {nextStep.key === 'contact_verification' ? (
              <ContactVerificationCard
                locale={locale}
                userContact={(user?.email || user?.phone) ?? undefined}
                onVerified={async () => {
                  try {
                    await completeStep({
                      stepKey: 'contact_verification',
                      payload: { code: STATIC_DEV_OTP },
                    }).unwrap();
                  } catch {
                    // Ignore if already marked
                  }
                  dispatch(
                    enqueueToast({
                      title: isBn ? 'যোগাযোগ নম্বর যাচাই সম্পন্ন!' : 'Contact verified!',
                      message: isBn
                        ? 'আপনার যোগাযোগ নম্বর সফলভাবে যাচাই হয়েছে।'
                        : 'Your contact details have been verified.',
                      type: 'success',
                    }),
                  );
                  refetch();
                }}
              />
            ) : nextStep.key === 'profile' && data.role === 'tutor' ? (
              <TutorProfileStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'profile' && data.role === 'student' ? (
              <StudentProfileStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'profile' && data.role === 'guardian' ? (
              <GuardianProfileStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'learning_preferences' && data.role === 'student' ? (
              <StudentLearningPreferencesStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'link_student' && data.role === 'guardian' ? (
              <GuardianLinkStudentStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'education' && data.role === 'tutor' ? (
              <TutorEducationStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'subjects' && data.role === 'tutor' ? (
              <TutorSubjectsStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'availability' && data.role === 'tutor' ? (
              <TutorAvailabilityStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'documents' ? (
              <DocumentsStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'security_setup' ? (
              <SecuritySetupStepForm
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : nextStep.key === 'review' ? (
              <ReviewStepForm locale={locale} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            ) : nextStep.submittable ? (
              <StepForm
                step={nextStep}
                role={data.role}
                locale={locale}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : null}
          </section>
        )}

        {(data.isComplete || data.status === 'pending_review') && user && (
          <div className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-left space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {data.isComplete
                    ? isBn
                      ? 'অনবোর্ডিং সম্পূর্ণ হয়েছে!'
                      : 'Onboarding Complete!'
                    : isBn
                      ? 'আপনার অনবোর্ডিং তথ্য পর্যালোচনায় রয়েছে'
                      : 'Your Onboarding is Under Review'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBn ? 'কমপ্লায়েন্স ও কেওয়াইসি ভেরিফিকেশন ডেস্ক' : 'Compliance & KYC Verification Desk'}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
              {data.isComplete
                ? isBn
                  ? 'আপনার অ্যাকাউন্ট এখন সম্পূর্ণরূপে সক্রিয়। আপনি ড্যাশবোর্ড থেকে সকল কার্যক্রম শুরু করতে পারেন।'
                  : 'Your account is now fully active. You can start all operations from your dashboard.'
                : isBn
                  ? 'আপনার জমা দেওয়া তথ্য ও প্রমাণাদি আমাদের কমপ্লায়েন্স টিম যাচাই করছে। অ্যাডমিন অনুমোদন সম্পন্ন হলে প্রোফাইল পাবলিকলি সক্রিয় হবে।'
                  : 'Our compliance team is reviewing your submitted details and evidence. Once approved by the administrator, your profile will become active.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href={withLocale(dashboardPathForRoles(user.roles, locale), locale)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                <span>{isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {user.roles.includes('tutor') && (
                <Link
                  href={withLocale('/dashboard/tutor/verification', locale)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <span>{isBn ? 'ভেরিফিকেশন ডসিয়ার দেখুন' : 'View Verification Dossier'}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
