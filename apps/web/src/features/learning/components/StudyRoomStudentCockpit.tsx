'use client';

import React from 'react';
import { Video, BookOpen, ExternalLink } from 'lucide-react';
import { type Locale } from '@/lib/i18n';

interface StudyRoomStudentCockpitProps {
  locale: Locale;
  activeSubjectName?: string;
  meetingUrl?: string | null;
  tutorName?: string;
}

export function StudyRoomStudentCockpit({
  locale,
  activeSubjectName,
  meetingUrl,
  tutorName,
}: StudyRoomStudentCockpitProps) {
  const isBn = locale === 'bn';
  const resolvedSubject =
    activeSubjectName || (isBn ? 'সাধারণ পাঠ্যক্রম ও স্টাডি রুম' : 'Study Room Hub');

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-6 text-foreground"
      data-testid="study-room-student-cockpit"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold w-fit">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডিজিটাল স্টাডি রুম' : 'Digital Study Room'}</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {resolvedSubject}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {tutorName
                ? isBn
                  ? `শিক্ষক: ${tutorName} • নিয়মিত ক্লাস নোট ও অ্যাসাইনমেন্ট অনুশীলন করুন।`
                  : `Tutor: ${tutorName} • Regular lecture notes, homework and tests.`
                : isBn
                  ? 'আপনার সক্রিয় কোর্সের উপস্থিতি, ক্লাস নোট ও অ্যাসাইনমেন্ট অনুশীলন করুন।'
                  : 'Track attendance, class notes and homework assignments for your active courses.'}
            </p>
          </div>
        </div>

        {meetingUrl && (
          <div className="shrink-0">
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isBn ? 'লাইভ ক্লাসে যোগ দিন' : 'Join Live Class'}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

