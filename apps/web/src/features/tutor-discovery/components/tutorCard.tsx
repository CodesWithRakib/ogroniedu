'use client';

import React from 'react';
import { Award, CheckCircle2, Clock, GraduationCap, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';

export function TutorCard({
  tutor,
  locale,
  onShowScore,
  onRequestBooking,
}: {
  tutor: TutorCardData;
  locale: Locale;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
}) {
  const dict = getDictionary(locale);
  const hourlyRate = tutor.hourlyRateMinor
    ? formatLocalizedNumber(Number(tutor.hourlyRateMinor) / 100, locale)
    : null;
  const expYears = tutor.yearsExperience
    ? formatLocalizedNumber(tutor.yearsExperience, locale)
    : null;

  return (
    <Card
      className="card-hover-elevate flex flex-col justify-between border-border bg-card shadow-sm"
      data-testid={`tutor-card-${tutor.id}`}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              {tutor.displayName}
            </CardTitle>
            {tutor.headline && (
              <p className="text-xs font-semibold text-primary mt-1 line-clamp-1">
                {tutor.headline}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onShowScore(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary-soft-foreground border border-primary/25 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            title={locale === 'bn' ? 'ম্যাচ স্কোরের ব্যাখ্যা দেখুন' : 'Click to view explainable match breakdown'}
            data-testid={`match-score-badge-${tutor.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="tabular-nums">{formatLocalizedNumber(tutor.matchScore, locale)} pts</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="success" className="gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            {dict.tutor?.badgeVerifiedTutor || 'Verified Tutor'}
          </Badge>
          {tutor.badges.includes('verified_identity') && (
            <Badge variant="default" className="gap-1 text-[11px]">
              <Award className="w-3 h-3 text-primary" />
              {dict.tutor?.badgeVerifiedIdentity || 'NID Verified'}
            </Badge>
          )}
          {tutor.badges.includes('verified_degree') && (
            <Badge variant="default" className="gap-1 text-[11px]">
              <GraduationCap className="w-3 h-3 text-primary" />
              {dict.tutor?.badgeVerifiedAcademic || 'Degree Verified'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {tutor.bio && (
          <p className="text-muted-foreground line-clamp-2 leading-relaxed">
            {tutor.bio}
          </p>
        )}

        <div className="space-y-1.5 bg-surface-muted p-2.5 rounded-xl border border-border/60">
          <span className="font-semibold text-foreground block">
            {dict.tutor?.subjectsTitle || 'Teaching Subjects'}:
          </span>
          <div className="flex flex-wrap gap-1">
            {tutor.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub.id}
                className="bg-card px-2.5 py-0.5 rounded-lg border border-border text-foreground text-[11px] font-medium shadow-2xs"
              >
                {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn}
              </span>
            ))}
            {tutor.subjects.length > 3 && (
              <span className="text-muted-foreground text-[11px] self-center">
                +{tutor.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
          {expYears && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {dict.discovery?.yearsExperience
                  ? dict.discovery.yearsExperience.replace('{count}', expYears)
                  : `${expYears} yrs experience`}
              </span>
            </div>
          )}
          {tutor.responseTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">~{formatLocalizedNumber(tutor.responseTimeMinutes, locale)}m response</span>
            </div>
          )}
          <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground">Modes:</span>
            {tutor.teachingModes.map((m) => (
              <span key={m} className="capitalize text-muted-foreground">
                {m.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/70 flex items-center justify-between">
        <div>
          {hourlyRate ? (
            <span className="text-base font-extrabold text-foreground tabular-nums">
              {dict.discovery?.hourlyRate
                ? dict.discovery.hourlyRate.replace('{rate}', hourlyRate)
                : `BDT ${hourlyRate}/hr`}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{dict.discovery.contactForFee}</span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onRequestBooking(tutor)}
          data-testid={`request-tutoring-btn-${tutor.id}`}
        >
          {dict.discovery?.requestSession || 'Request Tutoring'}
        </Button>
      </CardFooter>
    </Card>
  );
}
