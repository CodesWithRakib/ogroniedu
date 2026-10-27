'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Textarea,
  Label,
  NativeSelect,
} from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import {
  useGetEligibleBookingsQuery,
  useCreateReplacementCaseMutation,
} from '@/store/services/trust-api';

const REASON_LABELS: Record<string, { en: string; bn: string }> = {
  trial_dissatisfaction: {
    en: 'Dissatisfied after the first trial session',
    bn: 'প্রথম ট্রায়াল সেশনের পর সন্তুষ্ট নই',
  },
  teaching_mismatch: {
    en: 'Teaching style does not match',
    bn: 'পাঠদান পদ্ধতি মিলছে না',
  },
  tutor_no_show: { en: 'Tutor did not attend', bn: 'শিক্ষক ক্লাসে অনুপস্থিত ছিলেন' },
  frequent_tutor_cancellation: {
    en: 'Frequent tutor cancellations',
    bn: 'শিক্ষক ঘন ঘন ক্লাস বাতিল করছেন',
  },
  unprofessional_conduct: { en: 'Unprofessional conduct', bn: 'অপেশাদার আচরণ' },
  other: { en: 'Other reason', bn: 'অন্য কারণ' },
};

export interface NewReplacementRequestPageProps {
  locale: Locale;
}

export function NewReplacementRequestPage({ locale }: NewReplacementRequestPageProps) {
  const isBn = locale === 'bn';
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useGetEligibleBookingsQuery();
  const [createCase, createState] = useCreateReplacementCaseMutation();

  const bookings = data?.data ?? [];
  const [bookingId, setBookingId] = React.useState('');
  const [reasonCode, setReasonCode] = React.useState('');
  const [explanation, setExplanation] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const selected = bookings.find((b) => b.bookingId === bookingId) ?? bookings[0];

  React.useEffect(() => {
    if (!bookingId && bookings.length > 0) {
      setBookingId(bookings[0].bookingId);
      setReasonCode(bookings[0].eligibleReasonCodes[0] ?? '');
    }
  }, [bookings, bookingId]);

  React.useEffect(() => {
    if (selected && !selected.eligibleReasonCodes.includes(reasonCode)) {
      setReasonCode(selected.eligibleReasonCodes[0] ?? '');
    }
  }, [selected, reasonCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selected || !reasonCode) {
      setError(
        isBn
          ? 'একটি যোগ্য বুকিং ও কারণ নির্বাচন করুন।'
          : 'Select an eligible booking and a reason.',
      );
      return;
    }
    try {
      const result = await createCase({
        bookingId: selected.bookingId,
        reasonCode,
        explanation: explanation.trim(),
      }).unwrap();
      router.push(withLocale(`/tutor-replacements/${result.data.id}`, locale));
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { error?: { message?: string } } }).data?.error?.message ??
            (isBn ? 'অনুরোধ পাঠানো যায়নি।' : 'The request could not be submitted.'))
          : isBn
            ? 'অনুরোধ পাঠানো যায়নি।'
            : 'The request could not be submitted.';
      setError(message);
    }
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'নতুন রিপ্লেসমেন্ট অনুরোধ' : 'New replacement request'}
      subtitle={
        isBn
          ? 'শুধু যোগ্য বুকিংয়ের জন্য অনুরোধ করা যাবে'
          : 'Only bookings that currently meet the guarantee rules are listed'
      }
      actions={
        <Link
          href={withLocale('/tutor-replacements', locale)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {isBn ? 'কেস তালিকা' : 'Case list'}
        </Link>
      }
    >
      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading eligible bookings...'}
        </p>
      ) : isError ? (
        <Card className="py-12 text-center rounded-2xl">
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {isBn ? 'বুকিং লোড করা যায়নি।' : 'Failed to load eligible bookings.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="py-16 text-center rounded-2xl">
          <CardContent className="flex flex-col gap-3">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto" aria-hidden="true" />
            <h3 className="text-base font-bold text-foreground">
              {isBn ? 'যোগ্য বুকিং নেই' : 'No eligible bookings'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isBn
                ? 'রিপ্লেসমেন্ট অনুরোধ করার শর্ত পূরণ করে এমন কোনো বুকিং পাওয়া যায়নি।'
                : 'No booking currently meets the replacement guarantee conditions.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl flex flex-col gap-5"
          data-testid="replacement-request-form"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eligible-booking" className="text-xs font-semibold">
              {isBn ? 'যোগ্য বুকিং' : 'Eligible booking'}
            </Label>
            <NativeSelect
              id="eligible-booking"
              value={selected?.bookingId ?? ''}
              onChange={(e) => setBookingId(e.target.value)}
              className="text-xs"
            >
              {bookings.map((b) => (
                <option key={b.bookingId} value={b.bookingId}>
                  #{b.bookingId.slice(0, 8)} · {b.status}
                  {b.activeCaseId ? (isBn ? ' (সক্রিয় কেস আছে)' : ' (active case)') : ''}
                </option>
              ))}
            </NativeSelect>
            {selected && (
              <div className="flex flex-wrap gap-1.5 pt-1" data-testid="eligible-reasons">
                {selected.eligibleReasonCodes.map((code) => (
                  <Badge key={code} variant="outline" className="text-[11px]">
                    {REASON_LABELS[code]
                      ? isBn
                        ? REASON_LABELS[code].bn
                        : REASON_LABELS[code].en
                      : code}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="replacement-reason" className="text-xs font-semibold">
              {isBn ? 'কারণ' : 'Reason'}
            </Label>
            <NativeSelect
              id="replacement-reason"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="text-xs"
            >
              {(selected?.eligibleReasonCodes ?? []).map((code) => (
                <option key={code} value={code}>
                  {REASON_LABELS[code]
                    ? isBn
                      ? REASON_LABELS[code].bn
                      : REASON_LABELS[code].en
                    : code}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="replacement-explanation" className="text-xs font-semibold">
              {isBn ? 'বিস্তারিত ব্যাখ্যা' : 'Explanation'}
            </Label>
            <Textarea
              id="replacement-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={5}
              className="text-xs"
              placeholder={
                isBn
                  ? 'কী ঘটেছে এবং নতুন শিক্ষকের কাছ থেকে কী প্রত্যাশা করছেন (কমপক্ষে ১০ অক্ষর)...'
                  : 'What happened and what you expect from a replacement tutor (min 10 characters)...'
              }
            />
          </div>

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription role="alert">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={createState.isLoading || explanation.trim().length < 10}
              className="gap-1.5"
              data-testid="submit-replacement-request"
            >
              {createState.isLoading ? (
                isBn ? (
                  'পাঠানো হচ্ছে...'
                ) : (
                  'Submitting...'
                )
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {isBn ? 'অনুরোধ জমা দিন' : 'Submit request'}
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              {isBn
                ? 'সার্ভারে যোগ্যতা যাচাই হবে; শর্ত না মিললে অনুরোধ প্রত্যাখ্যাত হবে।'
                : 'Eligibility is re-validated on the server; invalid requests are rejected.'}
            </p>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}
