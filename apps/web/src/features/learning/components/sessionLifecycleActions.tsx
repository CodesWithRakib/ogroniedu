'use client';

import React from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { Alert, AlertDescription, Button } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { useCompleteSessionMutation, useStartSessionMutation } from '@/store/services/sessions-api';

/**
 * Lifecycle controls are rendered only for the assigned tutor or an admin.
 * The API re-checks the same rule, so hiding the button is UX, not security.
 */
export function SessionLifecycleActions({
  locale,
  sessionId,
  status,
  canManage,
}: {
  locale: Locale;
  sessionId: string;
  status: string;
  canManage: boolean;
}) {
  const t = getDictionary(locale).learning;
  const [startSession, { isLoading: starting }] = useStartSessionMutation();
  const [completeSession, { isLoading: completing }] = useCompleteSessionMutation();
  const [error, setError] = React.useState<string | null>(null);

  if (!canManage) return null;

  const run = async (action: 'start' | 'complete') => {
    setError(null);
    try {
      if (action === 'start') {
        await startSession(sessionId).unwrap();
      } else {
        await completeSession({ id: sessionId }).unwrap();
      }
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  };

  const canStart = status === 'scheduled' || status === 'reschedule_pending';
  const canComplete = status === 'in_progress';

  if (!canStart && !canComplete) {
    return error ? (
      <Alert variant="destructive">
        <AlertDescription role="alert">{error}</AlertDescription>
      </Alert>
    ) : null;
  }

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      data-testid="session-lifecycle"
    >
      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}
      {canStart && (
        <Button
          type="button"
          size="sm"
          isLoading={starting}
          onClick={() => void run('start')}
          data-testid="start-session-btn"
        >
          <Play className="w-4 h-4" />
          {t.startSessionAction}
        </Button>
      )}
      {canComplete && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          isLoading={completing}
          onClick={() => void run('complete')}
          data-testid="complete-session-btn"
        >
          <CheckCircle2 className="w-4 h-4" />
          {t.completeSessionAction}
        </Button>
      )}
    </div>
  );
}
