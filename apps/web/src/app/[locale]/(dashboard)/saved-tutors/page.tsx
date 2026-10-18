'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Bookmark, GraduationCap, MapPin, Star, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import {
  useGetSavedTutorsQuery,
  useUnsaveTutorMutation,
  type SavedTutorItem,
} from '@/store/services/tutors-api';

function SavedTutorCard({
  item,
  locale,
  isRemoving,
  onRemove,
}: {
  item: SavedTutorItem;
  locale: Locale;
  isRemoving: boolean;
  onRemove: (tutorId: string) => void;
}) {
  const isBn = locale === 'bn';
  const profile = item.profile;

  if (!profile) {
    return (
      <Card
        className="rounded-2xl border-border bg-card p-5 space-y-2"
        data-testid="saved-tutor-unavailable"
      >
        <p className="text-sm font-semibold text-foreground">
          {isBn ? 'শিক্ষক বর্তমানে বইযোগ্য নন' : 'Tutor is not currently bookable'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isBn
            ? 'যাচাইকরণ, প্রকাশনা বা অ্যাকাউন্ট অবস্থার কারণে প্রোফাইলটি এখন প্রকাশ্যে নেই।'
            : 'The profile is not publicly discoverable right now (verification, publication or account state).'}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isRemoving}
          onClick={() => onRemove(item.tutorId)}
          className="gap-1 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          {isBn ? 'সংরক্ষিত থেকে সরান' : 'Remove'}
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className="rounded-2xl border-border bg-card p-5 space-y-3"
      data-testid={`saved-tutor-${item.tutorId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={withLocale(`/tutors/${item.tutorId}`, locale)}
            className="text-base font-bold text-foreground hover:text-primary"
          >
            {profile.displayName}
          </Link>
          {profile.headline && (
            <p className="text-xs text-muted-foreground line-clamp-2">{profile.headline}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={isRemoving}
          onClick={() => onRemove(item.tutorId)}
          aria-label={isBn ? 'সংরক্ষিত থেকে সরান' : 'Remove from saved'}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {profile.totalReviews > 0 && profile.ratingAverage != null ? (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star className="w-3.5 h-3.5 fill-warning text-warning" aria-hidden="true" />
            {formatLocalizedNumber(profile.ratingAverage, locale)}
            <span className="text-muted-foreground font-normal">
              ({formatLocalizedNumber(profile.totalReviews, locale)})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{isBn ? 'রিভিউ নেই' : 'No reviews'}</span>
        )}
        {profile.yearsExperience != null && (
          <Badge variant="outline" className="gap-1">
            <GraduationCap className="w-3 h-3" aria-hidden="true" />
            {formatLocalizedNumber(profile.yearsExperience, locale)} {isBn ? 'বছর' : 'yrs'}
          </Badge>
        )}
        {profile.serviceAreas[0] && (
          <Badge variant="outline" className="gap-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {isBn ? profile.serviceAreas[0].districtNameBn : profile.serviceAreas[0].districtNameEn}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {isBn ? 'সংরক্ষিত:' : 'Saved:'} {new Date(item.savedAt).toLocaleDateString()}
        </span>
        <Link
          href={withLocale(`/tutors/${item.tutorId}`, locale)}
          className="font-semibold text-primary hover:underline"
        >
          {isBn ? 'প্রোফাইল দেখুন' : 'View profile'}
        </Link>
      </div>
    </Card>
  );
}

export default function SavedTutorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <SavedTutorsContent locale={locale} />
    </RequireAuth>
  );
}

function SavedTutorsContent({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';

  const { data, isLoading, isError, refetch } = useGetSavedTutorsQuery();
  const [unsaveTutor, { isLoading: isRemoving }] = useUnsaveTutorMutation();
  const saved = data?.data ?? [];

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'সংরক্ষিত শিক্ষক' : 'Saved Tutors'}
      subtitle={
        isBn
          ? 'পছন্দের যাচাইকৃত শিক্ষকদের তালিকা — শুধু আপনি দেখতে পারেন'
          : 'Your private shortlist of verified tutors'
      }
    >
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {isBn ? 'লোড হচ্ছে...' : 'Loading saved tutors...'}
        </div>
      ) : isError ? (
        <Card className="py-12 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isBn ? 'সংরক্ষিত শিক্ষক লোড করা যায়নি।' : 'Failed to load your saved tutors.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      ) : saved.length === 0 ? (
        <Card className="py-16 text-center rounded-2xl">
          <CardContent className="space-y-3">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto" aria-hidden="true" />
            <h3 className="text-base font-bold text-foreground">
              {isBn ? 'কোনো সংরক্ষিত শিক্ষক নেই' : 'No saved tutors yet'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {isBn
                ? 'সার্চ থেকে শিক্ষক সংরক্ষণ করে পরে দেখে নিতে পারেন।'
                : 'Save tutors from search to compare and revisit them later.'}
            </p>
            <Link href={withLocale('/tutors', locale)}>
              <Button size="sm">{isBn ? 'শিক্ষক খুঁজুন' : 'Browse tutors'}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="saved-tutors-list">
          {saved.map((item) => (
            <SavedTutorCard
              key={item.tutorId}
              item={item}
              locale={locale}
              isRemoving={isRemoving}
              onRemove={(tutorId) => {
                void unsaveTutor(tutorId);
              }}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
