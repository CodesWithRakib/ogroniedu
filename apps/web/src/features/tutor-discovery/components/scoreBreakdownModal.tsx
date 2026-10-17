'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="score-breakdown-modal"
        className="max-w-md w-full p-6 space-y-4 rounded-2xl bg-card border-border shadow-2xl"
      >
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="flex items-center gap-2 font-bold text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>{dict.discovery?.scoreBreakdownTitle || 'Ranking Factors'}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tutor.displayName} match score breakdown
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-sm font-semibold text-foreground">{tutor.displayName}</p>
          <p className="text-xs text-primary font-bold mt-0.5">
            Total Score: {formatLocalizedNumber(tutor.matchScore, locale)} Points
          </p>
        </div>

        <div className="space-y-2 pt-1 text-xs">
          <p className="text-muted-foreground">
            OgroniEdu scores tutors using transparent, deterministic verification &amp; quality
            signals:
          </p>
          <ul className="space-y-2 border border-border rounded-xl p-3 bg-muted/40">
            {tutor.rankingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={onClose}>
          {dict.common?.confirm || 'Understood'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
