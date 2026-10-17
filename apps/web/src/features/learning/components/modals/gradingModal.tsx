'use client';

import { AlertCircle, Edit3, History, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { AssignmentItem } from '../../types/learning.types';

export function GradingModal({
  locale,
  assignment,
  score,
  feedback,
  revisionReason,
  error,
  isPending,
  onScoreChange,
  onFeedbackChange,
  onRevisionReasonChange,
  onSubmit,
  onClose,
}: {
  locale: Locale;
  assignment: AssignmentItem;
  score: number;
  feedback: string;
  revisionReason: string;
  error: string;
  isPending: boolean;
  onScoreChange: (value: number) => void;
  onFeedbackChange: (value: string) => void;
  onRevisionReasonChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const dict = getDictionary(locale);
  const t = dict.learning;
  const previousScore = assignment.submission?.score;
  const hasPreviousScore = previousScore !== null && previousScore !== undefined;
  const isRevision = hasPreviousScore && previousScore !== score;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 border border-border shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-success-soft-foreground" />
            {hasPreviousScore ? t.reviseScore : t.gradeAction}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/40 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              {t.scoreLabel} (Max: {assignment.maxScore})
            </label>
            <Input
              type="number"
              min={0}
              max={assignment.maxScore}
              value={score}
              onChange={(e) => onScoreChange(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              {t.feedbackLabel}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border p-3 text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="Constructive feedback for learner..."
            />
          </div>

          {isRevision && (
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/40 space-y-1.5">
              <label className="text-xs font-bold text-warning  flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                {t.revisionReason} *
              </label>
              <p className="text-[11px] text-muted-foreground">{t.revisionReasonRequired}</p>
              <Input
                placeholder="e.g. Recalculated exercise 2 solution"
                value={revisionReason}
                onChange={(e) => onRevisionReasonChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {dict.common.cancel}
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={onSubmit}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            {dict.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
