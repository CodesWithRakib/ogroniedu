'use client';

import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';

export function ScoreBreakdownModal({
  tutor,
  locale,
  onClose,
}: {
  tutor: TutorCardData;
  locale: Locale;
  onClose: () => void;
}) {
  const dict = getDictionary(locale);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
      data-testid="score-breakdown-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              {dict.discovery?.scoreBreakdownTitle || 'Ranking Factors'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {tutor.displayName}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            Total Score: {formatLocalizedNumber(tutor.matchScore, locale)} Points
          </p>
        </div>

        <div className="space-y-2 pt-1 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            OgroniEdu scores tutors using transparent, deterministic verification &amp; quality
            signals:
          </p>
          <ul className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
            {tutor.rankingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
          {dict.common?.confirm || 'Understood'}
        </Button>
      </div>
    </div>
  );
}
