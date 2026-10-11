'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui';
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 border border-border shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {t.submitHomework}: {assignment.title}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            {t.submissionTextLabel}
          </label>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border p-3 text-sm bg-background text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            placeholder="Type your homework answer or paste notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {dict.common.cancel}
          </Button>
          <Button
            size="sm"
            disabled={isPending || !text.trim()}
            onClick={onSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {t.submitHomework}
          </Button>
        </div>
      </div>
    </div>
  );
}
