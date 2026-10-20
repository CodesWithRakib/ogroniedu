'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Download, ExternalLink, FileText, Link2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { useAppSelector } from '@/store';
import {
  useGetSessionLessonPlanQuery,
  useListAssignmentsQuery,
  useListSessionMaterialsQuery,
  type LearningMaterialRecord,
} from '@/store/services/learning-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function SessionLearningPanel({ locale, sessionId }: { locale: Locale; sessionId: string }) {
  const t = getDictionary(locale).learning;
  const token = useAppSelector((state) => state.auth.token);
  const plan = useGetSessionLessonPlanQuery(sessionId);
  const materials = useListSessionMaterialsQuery(sessionId);
  const assignments = useListAssignmentsQuery({ sessionId, pageSize: 20 });
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const download = async (material: LearningMaterialRecord) => {
    setDownloadError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/learning/materials/${material.id}/download`,
        {
          credentials: 'include',
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        },
      );
      if (!response.ok) {
        throw new Error(t.downloadAction);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = material.fileName ?? 'learning-material';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : String(err));
    }
  };

  const planData = plan.data?.data ?? null;
  const materialItems = materials.data?.data ?? [];
  const assignmentItems = assignments.data?.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-4" data-testid="session-learning-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t.sessionLessonPlan}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {plan.isLoading ? (
            <p className="text-muted-foreground">…</p>
          ) : !planData ? (
            <p className="text-muted-foreground">{t.noLessonPlans}</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">{planData.title}</p>
              {planData.description && (
                <p className="text-muted-foreground whitespace-pre-line">{planData.description}</p>
              )}
              {planData.objectives.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                  {planData.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              )}
              {planData.steps.length > 0 && (
                <ol className="list-decimal pl-5 space-y-0.5 text-muted-foreground">
                  {planData.steps.map((step, index) => (
                    <li key={`${step.title}-${index}`}>
                      {step.title}
                      {step.durationMinutes ? ` (${step.durationMinutes} min)` : ''}
                    </li>
                  ))}
                </ol>
              )}
              <Badge variant="outline">{planData.status}</Badge>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t.materials}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {downloadError && (
            <Alert variant="destructive">
              <AlertDescription role="alert">{downloadError}</AlertDescription>
            </Alert>
          )}
          {materialItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.noMaterials}</p>
          ) : (
            materialItems.map((material) => (
              <div
                key={material.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{material.title}</p>
                  {material.description && (
                    <p className="text-[11px] text-muted-foreground">{material.description}</p>
                  )}
                </div>
                {material.kind === 'link' && material.externalUrl ? (
                  <a
                    href={material.externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft-foreground"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {t.materialLink}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void download(material)}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t.downloadAction}
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">{t.linkedAssignments}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignmentItems.length === 0 ? (
            <EmptyState title={t.noAssignments} description={t.linkedAssignments} />
          ) : (
            assignmentItems.map((assignment) => (
              <Link
                key={assignment.id}
                href={withLocale(`/assignments/${assignment.id}`, locale)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 hover:bg-muted/40"
              >
                <span className="text-xs font-semibold text-foreground">{assignment.title}</span>
                <Badge variant="outline">{assignment.status}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
