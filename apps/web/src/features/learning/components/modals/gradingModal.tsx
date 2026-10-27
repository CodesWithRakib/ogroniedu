'use client';

import { AlertCircle, Edit3, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card text-card-foreground rounded-3xl max-w-lg w-full p-6 border border-border shadow-2xl flex flex-col gap-4 text-left">
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            <span>{hasPreviousScore ? t.reviseScore : t.gradeAction}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Grade homework submission for {assignment.title}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground block">
              {t.scoreLabel} (Max: {assignment.maxScore})
            </Label>
            <Input
              type="number"
              min={0}
              max={assignment.maxScore}
              value={score}
              onChange={(e) => onScoreChange(Number(e.target.value))}
              className="text-xs rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground block">{t.feedbackLabel}</Label>
            <Textarea
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border p-3 text-xs bg-card text-foreground focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
              placeholder="Constructive feedback for learner..."
            />
          </div>

          {isRevision && (
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/40 flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-warning flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                {t.revisionReason} *
              </Label>
              <p className="text-[11px] text-muted-foreground">{t.revisionReasonRequired}</p>
              <Input
                placeholder="e.g. Recalculated exercise 2 solution"
                value={revisionReason}
                onChange={(e) => onRevisionReasonChange(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            {dict.common.cancel}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={isPending}
            onClick={onSubmit}
            className="rounded-xl font-semibold"
          >
            {dict.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
