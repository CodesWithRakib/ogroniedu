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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted backdrop-blur-xs animate-in fade-in"
      data-testid="score-breakdown-modal"
    >
      <div className="bg-white  border border-border  rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border  pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-success-soft-foreground" />
            <h3 className="font-bold text-foreground ">
              {dict.discovery?.scoreBreakdownTitle || 'Ranking Factors'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground rounded-lg p-1"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground ">
            {tutor.displayName}
          </p>
          <p className="text-xs text-success-soft-foreground  font-bold mt-0.5">
            Total Score: {formatLocalizedNumber(tutor.matchScore, locale)} Points
          </p>
        </div>

        <div className="space-y-2 pt-1 text-xs">
          <p className="text-muted-foreground ">
            OgroniEdu scores tutors using transparent, deterministic verification &amp; quality
            signals:
          </p>
          <ul className="space-y-2 border border-border  rounded-xl p-3 bg-muted ">
            {tutor.rankingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-foreground ">
                <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
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
