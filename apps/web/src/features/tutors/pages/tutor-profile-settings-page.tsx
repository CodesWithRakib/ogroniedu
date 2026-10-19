'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Globe2, Save } from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  LoadingSpinner,
  Textarea,
} from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import {
  useGetOwnTutorProfileQuery,
  useUpdateOwnTutorProfileMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';

type TeachingMode = 'in_person' | 'online' | 'hybrid';

const TEACHING_MODES: Array<{ value: TeachingMode; en: string; bn: string }> = [
  { value: 'online', en: 'Online', bn: 'অনলাইন' },
  { value: 'in_person', en: 'In person', bn: 'সশরীরে' },
  { value: 'hybrid', en: 'Hybrid', bn: 'হাইব্রিড' },
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

/**
 * Tutor-owned bilingual profile editor.
 *
 * Both languages are edited side by side so tutors can publish a Bangla and an
 * English biography. Nothing is auto-translated: whatever is saved here is
 * exactly what the public profile shows for that language.
 */
export function TutorProfileSettingsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const profileQuery = useGetOwnTutorProfileQuery();
  const [updateProfile, updateState] = useUpdateOwnTutorProfileMutation();

  const profile = resolveProfile(profileQuery.data?.data);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (profile && !initialized) {
      setForm(toForm(profile));
      setInitialized(true);
    }
  }, [profile, initialized]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    // Both languages are required so every visitor sees tutor-authored copy in
    // their own language. The API still tolerates legacy single-language
    // profiles, but a tutor saving the editor must supply both.
    if (!form.headlineEn.trim()) {
      setError(isBn ? 'শিরোনাম ইংরেজিতে লিখুন।' : 'Add your headline in English.');
      return;
    }
    if (!form.headlineBn.trim()) {
      setError(isBn ? 'শিরোনাম বাংলায় লিখুন।' : 'Add your headline in Bangla.');
      return;
    }
    if (form.bioEn.trim().length < 20) {
      setError(
        isBn
          ? 'ইংরেজিতে কমপক্ষে ২০ অক্ষরের পরিচিতি লিখুন।'
          : 'Write at least 20 characters of biography in English.',
      );
      return;
    }
    if (form.bioBn.trim().length < 20) {
      setError(
        isBn
          ? 'বাংলায় কমপক্ষে ২০ অক্ষরের পরিচিতি লিখুন।'
          : 'Write at least 20 characters of biography in Bangla.',
      );
      return;
    }
    if (form.teachingModes.length === 0) {
      setError(
        isBn ? 'অন্তত একটি পাঠদান পদ্ধতি নির্বাচন করুন।' : 'Select at least one teaching mode.',
      );
      return;
    }

    try {
      await updateProfile({
        headlineEn: form.headlineEn.trim() || null,
        headlineBn: form.headlineBn.trim() || null,
        bioEn: form.bioEn.trim() || null,
        bioBn: form.bioBn.trim() || null,
        yearsExperience: form.yearsExperience.trim() ? Number(form.yearsExperience) : null,
        teachingModes: form.teachingModes,
        hourlyRateMinor: form.hourlyRate.trim() ? Math.round(Number(form.hourlyRate) * 100) : null,
      }).unwrap();
      setSaved(true);
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  };

  return (
    <TutorLayout
      locale={locale}
      title={isBn ? 'আমার প্রোফাইল' : 'My public profile'}
      subtitle={
        isBn
          ? 'বাংলা ও ইংরেজি — দুই ভাষায় আপনার পরিচিতি লিখুন। শিক্ষার্থীরা নিজের ভাষায় এটি দেখবে।'
          : 'Write your headline and biography in Bangla and English. Students see the language of their UI.'
      }
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={withLocale('/dashboard/tutor', locale)} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {isBn ? 'ড্যাশবোর্ডে ফিরুন' : 'Back to dashboard'}
          </Link>
        </Button>
      }
    >
      {profileQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {normalizeApiError(profileQuery.error, locale).message}
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="tutor-profile-form">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                {isBn ? 'প্রোফাইল সংরক্ষণ করা হয়েছে।' : 'Profile saved successfully.'}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="gap-1">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
                {isBn ? 'শিরোনাম' : 'Headline'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'সংক্ষিপ্ত এক বাক্যে আপনার বিশেষত্ব। দুই ভাষাতেই দেওয়ার চেষ্টা করুন।'
                  : 'One short line that captures your expertise. Fill both languages when possible.'}
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="headline-en" required>
                  {isBn ? 'শিরোনাম (ইংরেজি)' : 'Headline (English)'}
                </Label>
                <Input
                  id="headline-en"
                  value={form.headlineEn}
                  maxLength={160}
                  onChange={(event) => setField('headlineEn', event.target.value)}
                  placeholder="BUET graduate · Physics for Class 9–12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headline-bn" required>
                  {isBn ? 'শিরোনাম (বাংলা)' : 'Headline (Bangla)'}
                </Label>
                <Input
                  id="headline-bn"
                  value={form.headlineBn}
                  maxLength={160}
                  onChange={(event) => setField('headlineBn', event.target.value)}
                  placeholder="বুয়েট graduate · নবম–দ্বাদশ শ্রেণির পদার্থবিজ্ঞান"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-1">
              <h2 className="text-base font-bold text-foreground">
                {isBn ? 'পরিচিতি' : 'Biography'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'আপনার শিক্ষা, অভিজ্ঞতা ও পাঠদান পদ্ধতি বাংলা ও ইংরেজিতে লিখুন।'
                  : 'Describe your education, experience, and teaching approach in both languages.'}
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bio-en" required>
                  {isBn ? 'পরিচিতি (ইংরেজি)' : 'Biography (English)'}
                </Label>
                <Textarea
                  id="bio-en"
                  value={form.bioEn}
                  maxLength={2000}
                  rows={8}
                  onChange={(event) => setField('bioEn', event.target.value)}
                  placeholder="I teach Physics and Higher Math with a focus on problem solving…"
                />
                <p className="text-[11px] text-muted-foreground">
                  {formatLocalizedNumber(form.bioEn.length, locale)}/2000
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio-bn" required>
                  {isBn ? 'পরিচিতি (বাংলা)' : 'Biography (Bangla)'}
                </Label>
                <Textarea
                  id="bio-bn"
                  value={form.bioBn}
                  maxLength={2000}
                  rows={8}
                  onChange={(event) => setField('bioBn', event.target.value)}
                  placeholder="আমি পদার্থবিজ্ঞান ও উচ্চতর গণিত পড়াই, সমস্যা সমাধানে জোর দিই…"
                />
                <p className="text-[11px] text-muted-foreground">
                  {formatLocalizedNumber(form.bioBn.length, locale)}/2000
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-1">
              <h2 className="text-base font-bold text-foreground">
                {isBn ? 'পাঠদান ও ফি' : 'Teaching & fee'}
              </h2>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-foreground mb-2">
                  {isBn ? 'পাঠদান পদ্ধতি' : 'Teaching modes'}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TEACHING_MODES.map((mode) => {
                    const selected = form.teachingModes.includes(mode.value);
                    return (
                      <Button
                        key={mode.value}
                        type="button"
                        size="sm"
                        variant={selected ? 'primary' : 'outline'}
                        aria-pressed={selected}
                        onClick={() => toggleMode(mode.value)}
                      >
                        {isBn ? mode.bn : mode.en}
                      </Button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="years-experience">
                    {isBn ? 'অভিজ্ঞতা (বছর)' : 'Years of experience'}
                  </Label>
                  <Input
                    id="years-experience"
                    type="number"
                    min={0}
                    max={60}
                    value={form.yearsExperience}
                    onChange={(event) => setField('yearsExperience', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hourly-rate">
                    {isBn ? 'ঘণ্টাপ্রতি ফি (৳)' : 'Hourly fee (BDT)'}
                  </Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    min={0}
                    value={form.hourlyRate}
                    onChange={(event) => setField('hourlyRate', event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateState.isLoading} className="gap-2">
              <Save className="h-4 w-4" aria-hidden="true" />
              {updateState.isLoading
                ? isBn
                  ? 'সংরক্ষণ হচ্ছে…'
                  : 'Saving…'
                : isBn
                  ? 'প্রোফাইল সংরক্ষণ করুন'
                  : 'Save profile'}
            </Button>
          </div>
        </form>
      )}
    </TutorLayout>
  );
}
