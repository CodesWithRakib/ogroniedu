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
      className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-slate-200 dark:border-slate-800"
      data-testid={`tutor-card-${tutor.id}`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {tutor.displayName}
            </CardTitle>
            {tutor.headline && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 line-clamp-1">
                {tutor.headline}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onShowScore(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            title={locale === 'bn' ? 'ম্যাচ স্কোরের ব্যাখ্যা দেখুন' : 'Click to view explainable match breakdown'}
            data-testid={`match-score-badge-${tutor.id}`}
          >
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>{formatLocalizedNumber(tutor.matchScore, locale)} pts</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="success" className="gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            {dict.tutor?.badgeVerifiedTutor || 'Verified Tutor'}
          </Badge>
          {tutor.badges.includes('verified_identity') && (
            <Badge variant="default" className="gap-1 text-[11px]">
              <Award className="w-3 h-3 text-blue-600" />
              {dict.tutor?.badgeVerifiedIdentity || 'NID Verified'}
            </Badge>
          )}
          {tutor.badges.includes('verified_degree') && (
            <Badge variant="default" className="gap-1 text-[11px]">
              <GraduationCap className="w-3 h-3 text-purple-600" />
              {dict.tutor?.badgeVerifiedAcademic || 'Degree Verified'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {tutor.bio && (
          <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {tutor.bio}
          </p>
        )}

        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
            {dict.tutor?.subjectsTitle || 'Teaching Subjects'}:
          </span>
          <div className="flex flex-wrap gap-1">
            {tutor.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub.id}
                className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
              >
                {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn}
              </span>
            ))}
            {tutor.subjects.length > 3 && (
              <span className="text-slate-400 text-[11px] self-center">
                +{tutor.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 pt-1">
          {expYears && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {dict.discovery?.yearsExperience
                  ? dict.discovery.yearsExperience.replace('{count}', expYears)
                  : `${expYears} yrs experience`}
              </span>
            </div>
          )}
          {tutor.responseTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>~{formatLocalizedNumber(tutor.responseTimeMinutes, locale)}m response</span>
            </div>
          )}
          <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-600 dark:text-slate-400">Modes:</span>
            {tutor.teachingModes.map((m) => (
              <span key={m} className="capitalize text-slate-700 dark:text-slate-300">
                {m.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          {hourlyRate ? (
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {dict.discovery?.hourlyRate
                ? dict.discovery.hourlyRate.replace('{rate}', hourlyRate)
                : `BDT ${hourlyRate}/hr`}
            </span>
          ) : (
            <span className="text-xs text-slate-400">{dict.discovery.contactForFee}</span>
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
