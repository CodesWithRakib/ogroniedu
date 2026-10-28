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
      className="flex flex-col gap-4"
      data-testid={`onboarding-form-${step.key}`}
    >
      {fields.map((field: StepField) => {
        const id = `onboarding-${step.key}-${field.name}`;
        const label = isBn ? field.labelBn : field.labelEn;
        if (field.kind === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2">
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
              />
            ) : (
              <Input
                id={id}
                type={field.kind === 'number' ? 'number' : 'text'}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            )}
          </div>
        );
      })}
      <Button
        type="submit"
        isLoading={isSubmitting}
        size="sm"
        data-testid={`onboarding-submit-${step.key}`}
      >
        {isBn ? 'সংরক্ষণ করুন' : 'Save step'}
      </Button>
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
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValidSubmit)}
        className="flex flex-col gap-5 text-left w-full"
        data-testid="onboarding-tutor-profile-form"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="headline"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1">
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
              <FormItem className="flex flex-col gap-1">
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

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
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
                  rows={3}
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
            <FormItem className="flex flex-col gap-1">
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
                  rows={3}
                  maxLength={1000}
                  placeholder="আমি গত ৫ বছর ধরে শিক্ষার্থীদের পদার্থবিজ্ঞান ও গণিত সহজ পদ্ধতিতে পাঠদান করছি..."
                  className="text-xs resize-y"
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="yearsExperience"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1">
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
              <FormItem className="flex flex-col gap-1">
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

        <div className="flex flex-col gap-2">
          <FormLabel className="text-xs font-semibold text-foreground">
            {isBn ? 'পাঠদানের মাধ্যমসমূহ' : 'Teaching Modes'} *
          </FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                teachingModes.includes('online')
                  ? 'border-primary/50 bg-primary/5 shadow-xs text-foreground font-medium'
                  : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={teachingModes.includes('online')}
                onChange={() => toggleMode('online')}
                className="rounded text-primary h-4 w-4"
              />
              <span>{isBn ? 'অনলাইন ক্লাস' : 'Online'}</span>
            </label>
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                teachingModes.includes('student_home')
                  ? 'border-primary/50 bg-primary/5 shadow-xs text-foreground font-medium'
                  : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={teachingModes.includes('student_home')}
                onChange={() => toggleMode('student_home')}
                className="rounded text-primary h-4 w-4"
              />
              <span>{isBn ? 'শিক্ষার্থীর বাসা' : 'Student Home'}</span>
            </label>
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                teachingModes.includes('tutor_home')
                  ? 'border-primary/50 bg-primary/5 shadow-xs text-foreground font-medium'
                  : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={teachingModes.includes('tutor_home')}
                onChange={() => toggleMode('tutor_home')}
                className="rounded text-primary h-4 w-4"
              />
              <span>{isBn ? 'শিক্ষকের স্থান' : 'Tutor Place'}</span>
            </label>
          </div>
          {form.formState.errors.teachingModes && (
            <p className="text-[11px] text-destructive font-medium">
              {form.formState.errors.teachingModes.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          size="sm"
          className="w-full sm:w-auto font-semibold px-6"
          data-testid="onboarding-submit-profile"
        >
          {isBn ? 'প্রোফাইল সংরক্ষণ করুন' : 'Save Profile & Continue'}
        </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1">
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
              <FormItem className="flex flex-col gap-1">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1">
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
              <FormItem className="flex flex-col gap-1">
                <FormLabel className="text-xs font-semibold text-foreground">
                  {isBn ? 'পাশের সন' : 'Passing / Graduation Year'} *
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

        <Button
          type="submit"
          isLoading={isSubmitting}
          size="sm"
          className="w-full sm:w-auto font-semibold px-6"
          data-testid="onboarding-submit-education"
        >
          {isBn ? 'যোগ্যতা সংরক্ষণ করুন' : 'Save Education & Continue'}
        </Button>
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

    // Prevent duplicate subject + level combo
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
      className="flex flex-col gap-4 text-left"
      data-testid="onboarding-tutor-subjects-form"
    >
      <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-primary" />
          {isBn ? 'নতুন পাঠদান বিষয় নির্বাচন করুন' : 'Add Teaching Subject'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">{isBn ? 'বিষয়' : 'Subject'} *</Label>
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

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">
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

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">
              {isBn ? 'ফি (টাকা/ঘণ্টা)' : 'Rate (BDT/hr)'}
            </Label>
            <Input
              type="number"
              min={100}
              max={10000}
              step={50}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAddSubject}
          variant="secondary"
          size="sm"
          className="text-xs flex items-center gap-1"
          data-testid="onboarding-add-subject-btn"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isBn ? 'তালিকায় যোগ করুন' : 'Add to Teaching List'}</span>
        </Button>
      </div>

      {/* Added subjects preview list */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">
          {isBn
            ? `নির্বাচিত বিষয়সমূহ (${addedSubjects.length})`
            : `Selected Subjects (${addedSubjects.length})`}
        </Label>

        {addedSubjects.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 border border-dashed rounded-xl text-center">
            {isBn
              ? 'এখনও কোনো বিষয় যোগ করা হয়নি। উপরের ড্রপডাউন থেকে অন্তত একটি বিষয় যোগ করুন।'
              : 'No subjects added yet. Please add at least one subject from above.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {addedSubjects.map((item, idx) => (
              <div
                key={`${item.subjectId}-${item.educationLevelId}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card shadow-xs text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{item.subjectName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.levelName} • ৳{item.rate}/ঘণ্টা
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(idx)}
                  className="p-1 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={addedSubjects.length === 0 || isSubmitting}
        isLoading={isSubmitting}
        size="sm"
        className="w-full sm:w-auto"
        data-testid="onboarding-submit-subjects"
      >
        {isBn ? 'বিষয়সমূহ সংরক্ষণ করুন' : 'Save Subjects & Continue'}
      </Button>
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
      className="flex flex-col gap-4 text-left"
      data-testid="onboarding-tutor-availability-form"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          {isBn ? 'কুইক প্রিসেট:' : 'Quick Presets:'}
        </span>
        <button
          type="button"
          onClick={() => applyPreset('weekdays')}
          className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium"
        >
          {isBn ? 'কার্যদিবস (রবি-বৃহ ০৯-১৮)' : 'Weekdays (09-18)'}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('evening')}
          className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium"
        >
          {isBn ? 'সন্ধ্যা ব্যাচ (১৮-২১)' : 'Evening (18-21)'}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('all')}
          className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium"
        >
          {isBn ? 'সকল দিন (১০-২০)' : 'All 7 Days (10-20)'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">{isBn ? 'বার' : 'Weekday'}</Label>
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

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">{isBn ? 'শুরু' : 'Start Time'}</Label>
            <Input
              type="time"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold">{isBn ? 'সমাপ্তি' : 'End Time'}</Label>
            <Input
              type="time"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAddSlot}
          variant="secondary"
          size="sm"
          className="text-xs flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isBn ? 'স্লট যুক্ত করুন' : 'Add Time Slot'}</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">
          {isBn
            ? `সক্রিয় প্রাপ্যতা সময়সূচি (${slots.length})`
            : `Active Weekly Slots (${slots.length})`}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map((s, idx) => {
            const dayName = isBn
              ? WEEKDAYS.find((d) => d.id === s.weekday)?.bn
              : WEEKDAYS.find((d) => d.id === s.weekday)?.en;
            return (
              <div
                key={`${s.weekday}-${s.startLocal}-${s.endLocal}-${idx}`}
                className="flex items-center justify-between p-2 rounded-xl border border-border bg-card text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground block">{dayName}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {s.startLocal} – {s.endLocal}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(idx)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="submit"
        disabled={slots.length === 0 || isSubmitting}
        isLoading={isSubmitting}
        size="sm"
        className="w-full sm:w-auto"
        data-testid="onboarding-submit-availability"
      >
        {isBn ? 'সময়সূচি সংরক্ষণ করুন' : 'Save Schedule & Continue'}
      </Button>
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
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-3">
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
            {isBn ? 'স্বয়ংক্রিয় প্রিভিউ' : 'Instant Upload'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isBn
            ? 'আমাদের সিস্টেমে জেনারেট করা বাস্তবসম্মত সরকারি এনআইডি এবং বুয়েট ডিগ্রি সনদপত্র সরাসরি যুক্ত করুন:'
            : 'Add realistic Bangladesh Smart NID and BUET degree certificates directly:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {SAMPLE_DOCS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => handleLoadSample(sample)}
              disabled={uploadingSample === sample.name || uploading}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all text-left group cursor-pointer"
            >
              <img
                src={sample.path}
                alt={sample.name}
                className="w-12 h-9 object-cover rounded-md border border-border shrink-0 shadow-2xs"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {isBn ? sample.titleBn : sample.titleEn}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="uppercase font-mono">{sample.type}</span>
                  <span>•</span>
                  <span>
                    {uploadingSample === sample.name
                      ? isBn
                        ? 'লোড হচ্ছে...'
                        : 'Loading...'
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
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3.5">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          {isBn ? 'আপনার নিজস্ব ফাইল আপলোড করুন' : 'Or Upload Your Own Document'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">{isBn ? 'নথির ধরন' : 'Document Type'} *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nid">
                  {isBn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}
                </SelectItem>
                <SelectItem value="degree">
                  {isBn ? 'শিক্ষাগত সনদ (Academic Certificate)' : 'Academic Certificate'}
                </SelectItem>
                <SelectItem value="other_evidence">
                  {isBn ? 'অন্যান্য প্রমাণপত্র (Other Evidence)' : 'Other Evidence'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">
              {isBn
                ? 'প্রমাণপত্র ফাইল (PDF / ছবি, সর্বোচ্চ ১০MB)'
                : 'Evidence File (PDF / Image, Max 10MB)'}{' '}
              *
            </Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="text-xs cursor-pointer"
            />
          </div>
        </div>

        {uploading && (
          <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {isBn ? 'ফাইল আপলোড হচ্ছে...' : 'Uploading file...'}
          </p>
        )}
      </div>

      {/* List of Attached Documents */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">
              {isBn
                ? `সংযুক্ত নথিসমূহ (${uploadedFiles.length})`
                : `Attached Documents (${uploadedFiles.length})`}
            </Label>
          </div>
          <div className="flex flex-col gap-2">
            {uploadedFiles.map((doc, idx) => (
              <div
                key={`${doc.id}-${idx}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {doc.previewUrl ? (
                    <img
                      src={doc.previewUrl}
                      alt={doc.name}
                      className="w-12 h-9 object-cover rounded-md border border-border shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{doc.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-mono px-1.5 py-0"
                      >
                        {doc.type}
                      </Badge>
                      <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(idx)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadError && <p className="text-[11px] text-destructive font-medium">{uploadError}</p>}

      <Button
        type="submit"
        disabled={uploadedFiles.length === 0 || uploading || isSubmitting}
        isLoading={isSubmitting}
        size="sm"
        className="w-full sm:w-auto font-semibold px-6"
        data-testid="onboarding-submit-documents"
      >
        {isBn ? 'নথি সংরক্ষণ ও পরবর্তী ধাপ' : 'Save Documents & Continue'}
      </Button>
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
      className="flex flex-col gap-4 text-left"
      data-testid="onboarding-security-form"
    >
      <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          <Shield className="h-4 w-4 text-primary" />
          <span>{isBn ? 'নিরাপত্তা ও নৈতিক আচরণবিধি' : 'Security & Code of Conduct'}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isBn
            ? 'অগ্রণী এডু প্ল্যাটফর্মে শিক্ষক হিসেবে আপনি সকল শিক্ষার্থীর নিরাপত্তা, পেশাদারিত্ব ও সততা রক্ষা করতে অঙ্গীকারবদ্ধ। কোনো মিথ্যা তথ্য প্রদান বা বিভ্রান্তিকর নথি আপলোড করলে অ্যাকাউন্ট আজীবন স্থগিত হতে পারে।'
            : 'As an educator on OgroniEdu, you commit to student safety, professionalism, and academic integrity. Submitting false info or invalid credentials will lead to permanent suspension.'}
        </p>
        <label className="flex items-center gap-2 cursor-pointer pt-2">
          <Checkbox
            id="acknowledgePolicy"
            checked={agreed}
            onCheckedChange={(c) => setAgreed(Boolean(c))}
          />
          <span className="text-xs font-medium text-foreground">
            {isBn
              ? 'আমি প্ল্যাটফর্মের সমস্ত নীতিমালা ও নিরাপত্তা শর্তাবলী মেনে নিচ্ছি'
              : 'I acknowledge and accept all terms of service and security policies'}
          </span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={!agreed || isSubmitting}
        isLoading={isSubmitting}
        size="sm"
        data-testid="onboarding-submit-security"
      >
        {isBn ? 'স্বীকারোক্তি সম্পন্ন করুন' : 'Confirm & Proceed'}
      </Button>
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
      className="flex flex-col gap-4 text-left"
      data-testid="onboarding-review-form"
    >
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
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

      <Button
        type="submit"
        isLoading={isSubmitting}
        size="default"
        className="w-full sm:w-auto font-bold"
        data-testid="onboarding-submit-review"
      >
        {isBn ? 'যাচাইকরণের জন্য জমা দিন' : 'Submit for Verification'}
      </Button>
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
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
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
        setFeedback(
          isBn
            ? `যাচাই কোড পাঠানো হয়েছে (${data.debugCode ? 'কোড: ' + data.debugCode : userContact})`
            : `Verification code sent (${data.debugCode ? 'Code: ' + data.debugCode : userContact})`,
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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!userContact || !code.trim()) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: userContact,
          code: code.trim(),
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
    <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex flex-col gap-3 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{isBn ? 'যোগাযোগ নম্বর / ইমেইল' : 'Contact'}</span>
        <span className="text-xs text-muted-foreground">{userContact}</span>
      </div>

      {!codeSent ? (
        <Button
          onClick={handleSendCode}
          isLoading={isSending}
          size="sm"
          variant="outline"
          className="w-full text-xs"
        >
          {isBn ? 'যাচাইকরণ কোড পাঠান' : 'Send verification code'}
        </Button>
      ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            maxLength={6}
            className="text-xs tracking-widest text-center"
          />
          <Button type="submit" isLoading={isVerifying} size="sm" className="w-full text-xs">
            {isBn ? 'কোড যাচাই সম্পন্ন করুন' : 'Verify code'}
          </Button>
        </form>
      )}

      {feedback && <p className="text-[11px] text-primary font-medium">{feedback}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function OnboardingPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, error } = useGetMyOnboardingQuery();
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

  const nextStep = data.steps.find((step) => step.key === data.nextStep) ?? null;
  const progress = data.steps.length
    ? Math.round(
        (data.steps.filter((s) => s.status === 'completed').length / data.steps.length) * 100,
      )
    : 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8" data-testid="onboarding-page">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">
          {isBn ? 'অ্যাকাউন্ট সম্পূর্ণ করুন' : 'Complete your account setup'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {(isBn ? data.roleLabelBn : data.roleLabelEn) ??
            (isBn ? 'আপনার ভূমিকা নির্বাচিত হয়নি' : 'No role track available')}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{isBn ? 'অগ্রগতি' : 'Progress'}</span>
          <span data-testid="onboarding-progress">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 w-full" />
      </div>

      {data.isComplete && (
        <div
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary-soft p-4 text-xs font-medium text-primary"
          data-testid="onboarding-complete"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <span>
            {isBn
              ? 'অনবোর্ডিং সম্পন্ন হয়েছে। আপনার ড্যাশবোর্ডে যান।'
              : 'Onboarding is complete. Head to your dashboard.'}
          </span>
        </div>
      )}

      <ul className="mb-6 flex flex-col gap-2" data-testid="onboarding-step-list">
        {data.steps.map((step) => (
          <li
            key={step.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span className="text-xs font-semibold text-foreground">
                {isBn ? step.titleBn : step.titleEn}
              </span>
            </div>
            <Badge
              variant={
                step.status === 'completed'
                  ? 'success'
                  : step.status === 'pending_review'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {step.status === 'completed'
                ? isBn
                  ? 'সম্পন্ন'
                  : 'Done'
                : step.status === 'pending_review'
                  ? isBn
                    ? 'পর্যালোচনায়'
                    : 'In review'
                  : isBn
                    ? 'বাকি'
                    : 'Pending'}
            </Badge>
          </li>
        ))}
      </ul>

      {data.requiresApproval && !data.isComplete && (
        <p className="mb-4 text-[11px] text-warning">
          {isBn
            ? 'কিছু ধাপ যাচাইকরণ/অনুমোদনের সাপেক্ষে। অনুমোদন ছাড়া এই ধাপগুলো সম্পন্ন হবে না।'
            : 'Some steps require review/approval and complete only after a platform decision.'}
        </p>
      )}

      {formError && (
        <Alert
          variant="destructive"
          className="mb-4 rounded-xl"
          data-testid="onboarding-form-error"
        >
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {nextStep && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            {isBn ? nextStep.titleBn : nextStep.titleEn}
          </h2>

          {nextStep.key === 'contact_verification' ? (
            <ContactVerificationCard
              locale={locale}
              userContact={(user?.email || user?.phone) ?? undefined}
              onVerified={() => {
                dispatch(
                  enqueueToast({
                    title: isBn ? 'যোগাযোগ নম্বর যাচাই সম্পন্ন!' : 'Contact verified!',
                    message: isBn
                      ? 'আপনার যোগাযোগ নম্বর সফলভাবে যাচাই হয়েছে।'
                      : 'Your contact details have been verified.',
                    type: 'success',
                  }),
                );
                window.location.reload();
              }}
            />
          ) : nextStep.key === 'profile' && data.role === 'tutor' ? (
            <TutorProfileStepForm
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
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {data.isComplete
                ? isBn
                  ? 'অনবোর্ডিং সম্পন্ন হয়েছে!'
                  : 'Onboarding complete!'
                : isBn
                  ? 'আপনার অনবোর্ডিং তথ্য পর্যালোচনায় রয়েছে'
                  : 'Your onboarding is under review'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {data.isComplete
              ? isBn
                ? 'আপনার অ্যাকাউন্ট এখন সম্পূর্ণরূপে সক্রিয়। আপনি ড্যাশবোর্ড থেকে সকল কার্যক্রম শুরু করতে পারেন।'
                : 'Your account is now fully active. You can start all operations from your dashboard.'
              : isBn
                ? 'আপনার জমা দেওয়া তথ্য ও প্রমাণাদি আমাদের কমপ্লায়েন্স টিম যাচাই করছে। পর্যালোচনাকালে আপনি ড্যাশবোর্ডে গিয়ে আপনার প্রাপ্যতা ও প্রোফাইল প্রস্তুত করতে পারেন।'
                : 'Our compliance team is reviewing your submitted details and evidence. While under review, you can set up your availability and profile in your dashboard.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={withLocale(dashboardPathForRoles(user.roles, locale), locale)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <span>{isBn ? 'ড্যাশবোর্ডে যান' : 'Go to dashboard'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {user.roles.includes('tutor') && (
              <Link
                href={withLocale('/dashboard/tutor/verification', locale)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <span>{isBn ? 'ভেরিফিকেশন ডসিয়ার দেখুন' : 'View verification dossier'}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
