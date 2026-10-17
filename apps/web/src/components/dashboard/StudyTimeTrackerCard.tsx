'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export interface StudyTimeTrackerCardProps {
  locale: Locale;
  title?: string;
  subtitle?: string;
}

export function StudyTimeTrackerCard({ locale, title, subtitle }: StudyTimeTrackerCardProps) {
  const isBn = locale === 'bn';
  const heading = title ?? (isBn ? 'স্টাডি টাইম ট্র্যাকার' : 'Time Tracker');
  const sub = subtitle ?? (isBn ? 'ফোকাস ও শেখার সময় গণনা' : 'Focus session duration');

  const [seconds, setSeconds] = useState(5048); // Initial starting time ~ 01:24:08
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="relative rounded-3xl p-5 sm:p-6 shadow-md overflow-hidden bg-card border border-brand/25 text-foreground flex flex-col justify-between select-none">
      {/* Abstract undulating mesh wave background pattern (Donezo visual style) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-full h-full object-cover">
          <path
            d="M 0,100 C 40,60 80,140 120,90 C 160,40 180,120 200,100 L 200,200 L 0,200 Z"
            fill="currentColor"
            className="text-success-soft-foreground"
          />
          <path
            d="M 0,130 C 50,90 90,160 140,110 C 180,80 190,140 200,130 L 200,200 L 0,200 Z"
            fill="currentColor"
            className="text-primary-soft-foreground opacity-60"
          />
        </svg>
      </div>

      {/* Top: Header */}
      <div className="relative z-10 flex items-center justify-between pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-success-soft-foreground">
            {heading}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-success-soft-foreground backdrop-blur-xs">
          <Clock className="h-4 w-4" />
        </div>
      </div>

      {/* Center: Digital Clock display */}
      <div className="relative z-10 my-4 text-center">
        <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-foreground drop-shadow-md">
          {hrs}:{mins}:{secs}
        </span>
      </div>

      {/* Bottom: Play/Pause and Reset buttons */}
      <div className="relative z-10 flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm hover:bg-primary-hover hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setSeconds(0);
          }}
          className="h-10 w-10 rounded-full bg-destructive/80 hover:bg-destructive/90 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          aria-label="Reset timer"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
