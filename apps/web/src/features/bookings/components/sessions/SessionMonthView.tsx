'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Sparkles,
  User,
  GraduationCap,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { formatTime } from '@/lib/format';
import { withLocale } from '@/lib/auth';
import type { CalendarSessionItem } from '../../types/session.types';

interface SessionMonthViewProps {
  locale: Locale;
  sessions: CalendarSessionItem[];
}

export function SessionMonthView({ locale, sessions }: SessionMonthViewProps) {
  const isBn = locale === 'bn';
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDaySessions, setSelectedDaySessions] = useState<CalendarSessionItem[] | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDaySessions(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDaySessions(null);
  };

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ];

  const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDaysBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

  const monthLabel = isBn ? `${monthNamesBn[month]} ${year}` : `${monthNamesEn[month]} ${year}`;

  // Map sessions by day of month (YYYY-MM-DD)
  const sessionsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarSessionItem[]>();
    for (const s of sessions) {
      const d = new Date(s.startsAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = map.get(key) || [];
      existing.push(s);
      map.set(key, existing);
    }
    return map;
  }, [sessions]);

  // Calendar cells
  const cells: Array<{ dayNumber: number | null; dateKey: string | null; sessions: CalendarSessionItem[] }> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ dayNumber: null, dateKey: null, sessions: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const daySessions = sessionsByDate.get(dateKey) || [];
    cells.push({ dayNumber: d, dateKey, sessions: daySessions });
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header with Prev/Next navigation */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-black text-foreground">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            className="rounded-xl h-8 w-8 p-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDaySessions(null);
            }}
            className="rounded-xl h-8 text-xs font-semibold px-2.5"
          >
            {isBn ? 'চলতি মাস' : 'Today'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="rounded-xl h-8 w-8 p-0"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-muted-foreground pb-1">
        {(isBn ? weekDaysBn : weekDaysEn).map((day, idx) => (
          <div key={idx} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell, idx) => {
          if (cell.dayNumber === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[70px] sm:min-h-[90px] rounded-xl bg-surface/30 border border-transparent"
              />
            );
          }

          const hasSessions = cell.sessions.length > 0;
          const isToday =
            new Date().getDate() === cell.dayNumber &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${cell.dayNumber}`}
              onClick={() => {
                if (hasSessions) setSelectedDaySessions(cell.sessions);
              }}
              className={`min-h-[70px] sm:min-h-[90px] p-2 rounded-xl sm:rounded-2xl border transition-all text-left flex flex-col justify-between ${
                hasSessions
                  ? 'cursor-pointer hover:border-primary/60 hover:shadow-md bg-card/90'
                  : 'bg-card/40'
              } ${
                isToday
                  ? 'border-primary ring-1 ring-primary/40 bg-primary-soft/10'
                  : 'border-border/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center rounded-full w-5 h-5 ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {hasSessions && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>

              {hasSessions && (
                <div className="space-y-1 mt-1">
                  {cell.sessions.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-primary-soft text-primary border border-primary/20"
                    >
                      {formatTime(s.startsAt, locale)} {s.subjectName || (isBn ? 'ক্লাস' : 'Class')}
                    </div>
                  ))}
                  {cell.sessions.length > 2 && (
                    <span className="text-[9px] font-bold text-muted-foreground block text-right">
                      +{cell.sessions.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Flyout / Detail Drawer */}
      {selectedDaySessions && selectedDaySessions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-primary/30 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span>
                {isBn ? 'নির্বাচিত দিনের ক্লাসসমূহ' : 'Classes on Selected Day'} ({selectedDaySessions.length})
              </span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDaySessions(null)}
              className="text-xs text-muted-foreground h-7"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDaySessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-surface border border-border/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <span className="font-black text-foreground block truncate">
                    {s.subjectName || (isBn ? 'ক্লাস' : 'Class')}
                  </span>
                  <span className="text-muted-foreground text-[11px] block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(s.startsAt, locale)}</span> • <span>{s.tutorName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.meetingUrl && (
                    <a
                      href={s.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isBn ? 'প্রবেশ' : 'Join'}</span>
                    </a>
                  )}
                  <Button asChild variant="outline" size="sm" className="h-7 text-[11px] px-2 rounded-lg">
                    <Link href={withLocale(`/sessions/${s.id}`, locale)}>
                      {isBn ? 'বিবরণ' : 'Details'}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
