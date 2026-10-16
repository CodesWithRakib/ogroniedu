'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale, dashboardPathForRoles } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import {
  useGetMyOnboardingQuery,
  useCompleteOnboardingStepMutation,
  type OnboardingStep,
} from '@/store/services/onboarding-api';
import { normalizeUnknownError } from '@/lib/api-error';
import { buildStepPayload, fieldsForStep, type StepField } from '../step-forms';

function StepIcon({ status }: { status: OnboardingStep['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === 'pending_review') return <Clock className="h-5 w-5 text-amber-500" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

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
    <form onSubmit={handleSubmit} className="space-y-3" data-testid={`onboarding-form-${step.key}`}>
      {fields.map((field: StepField) => {
        const id = `onboarding-${step.key}-${field.name}`;
        const label = isBn ? field.labelBn : field.labelEn;
        if (field.kind === 'checkbox') {
          return (
            <div key={field.name} className="flex items-start gap-2">
              <input
                id={id}
                type="checkbox"
                checked={values[field.name] === true}
                onChange={(e) => setValue(field.name, e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <label htmlFor={id} className="text-xs text-foreground">
                {label}
              </label>
            </div>
          );
        }
        return (
          <div key={field.name} className="space-y-1 text-left">
            <label htmlFor={id} className="text-xs font-bold text-foreground">
              {label}
              {field.required ? ' *' : ''}
            </label>
            {field.kind === 'textarea' ? (
              <textarea
                id={id}
                rows={3}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            ) : (
              <input
                id={id}
                type={field.kind === 'number' ? 'number' : 'text'}
                required={field.required}
                placeholder={field.placeholder}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValue(field.name, e.target.value)}
                className="w-full h-10 rounded-2xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            )}
          </div>
        );
      })}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-10 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground disabled:opacity-60"
        data-testid={`onboarding-submit-${step.key}`}
      >
        {isBn ? 'সংরক্ষণ করুন' : 'Save step'}
      </button>
    </form>
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
            ? 'অনবোর্ডিং অগ্রগতি সংরক্ষণ করা হয়েছে।'
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10" data-testid="onboarding-error">
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {isBn
              ? 'অনবোর্ডিং অবস্থা লোড করা যায়নি। পরে আবার চেষ্টা করুন।'
              : 'Could not load onboarding status. Please try again later.'}
          </span>
        </div>
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
    <div className="mx-auto max-w-3xl px-4 py-8" data-testid="onboarding-page">
      <header className="mb-6 space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          {isBn ? 'অ্যাকাউন্ট সম্পূর্ণ করুন' : 'Complete your account setup'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {(isBn ? data.roleLabelBn : data.roleLabelEn) ??
            (isBn ? 'আপনার ভূমিকা নির্বাচিত হয়নি' : 'No role track available')}
        </p>
      </header>

      <div className="mb-6 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>{isBn ? 'অগ্রগতি' : 'Progress'}</span>
          <span data-testid="onboarding-progress">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {data.isComplete && (
        <div
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300"
          data-testid="onboarding-complete"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {isBn
              ? 'অনবোর্ডিং সম্পন্ন হয়েছে। আপনার ড্যাশবোর্ডে যান।'
              : 'Onboarding is complete. Head to your dashboard.'}
          </span>
        </div>
      )}

      <ul className="mb-6 space-y-2" data-testid="onboarding-step-list">
        {data.steps.map((step) => (
          <li
            key={step.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span className="text-xs font-semibold text-foreground">
                {isBn ? step.titleBn : step.titleEn}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
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
            </span>
          </li>
        ))}
      </ul>

      {data.requiresApproval && !data.isComplete && (
        <p className="mb-4 text-[11px] text-amber-600 dark:text-amber-400">
          {isBn
            ? 'কিছু ধাপ যাচাইকরণ/অনুমোদনের সাপেক্ষে। অনুমোদন ছাড়া এই ধাপগুলো সম্পন্ন হবে না।'
            : 'Some steps require review/approval and complete only after a platform decision.'}
        </p>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
          data-testid="onboarding-form-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {nextStep && nextStep.submittable && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            {isBn ? nextStep.titleBn : nextStep.titleEn}
          </h2>
          <StepForm
            step={nextStep}
            role={data.role}
            locale={locale}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </section>
      )}

      {data.isComplete && user && (
        <Link
          href={withLocale(dashboardPathForRoles(user.roles, locale), locale)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <span>{isBn ? 'ড্যাশবোর্ডে যান' : 'Go to dashboard'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
