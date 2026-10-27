'use client';

import React from 'react';
import Link from 'next/link';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import { formatBDTMinor } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { ActiveTutorInfo } from '../hooks/use-student-dashboard';
import type { Locale } from '@/lib/i18n';

interface StudentMyTutorsCardProps {
  locale: Locale;
  tutors: ActiveTutorInfo[];
  isLoading?: boolean;
}

export function StudentMyTutorsCard({ locale, tutors, isLoading }: StudentMyTutorsCardProps) {
  const isBn = locale === 'bn';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'আমার মেন্টর' : 'Instructors'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'আমার শিক্ষকবৃন্দ' : 'My Enrolled Tutors'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/tutors', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'নতুন শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : tutors.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/40 border border-border mx-auto flex items-center justify-center text-muted-foreground mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {isBn ? 'এখনও কোনো সক্রিয় শিক্ষক নেই' : 'No active tutors enrolled yet'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
              {isBn
                ? 'যাচাইকৃত শিক্ষকদের তালিকা থেকে আপনার পাঠ্যক্রমের জন্য সেরা শিক্ষক নির্বাচন করুন।'
                : 'Browse verified tutors to start your personalized learning journey.'}
            </p>
            <Link
              href={withLocale('/tutors', locale)}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs shadow-blue-500/25 transition-all"
            >
              <span>{isBn ? 'শিক্ষক ব্রাউজ করুন' : 'Browse Tutors'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            data-testid="student-active-tutors-list"
          >
            {tutors.slice(0, 4).map((t) => {
              const initials = t.displayName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={t.tutorUserId}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-border">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {t.displayName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">
                        {t.subjectName}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {t.hourlyRateMinor
                        ? `${formatBDTMinor(t.hourlyRateMinor, locale)} ${isBn ? '/ ক্লাস' : '/ session'}`
                        : isBn
                          ? 'মানসম্মত রেট'
                          : 'Standard Rate'}
                    </span>
                    <Link
                      href={withLocale('/dashboard/student/learning', locale)}
                      className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>{isBn ? 'স্টাডি রুম' : 'Study Room'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
