'use client';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { AssignmentItem } from '../../types/learning.types';

export function HomeworkSubmitModal({
  locale,
  assignment,
  text,
  isPending,
  onTextChange,
  onSubmit,
  onClose,
}: {
  locale: Locale;
  assignment: AssignmentItem;
  text: string;
  isPending: boolean;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const dict = getDictionary(locale);
  const t = dict.learning;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card rounded-2xl max-w-lg w-full p-6 border border-border shadow-2xl space-y-4">
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="text-base font-bold text-foreground">
            {t.submitHomework}: {assignment.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Submit homework answer for assignment {assignment.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">{t.submissionTextLabel}</Label>
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border p-3 text-xs bg-card text-foreground focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
            placeholder="Type your homework answer or paste notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            {dict.common.cancel}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={isPending || !text.trim()}
            onClick={onSubmit}
            className="rounded-xl font-semibold"
          >
            {t.submitHomework}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
