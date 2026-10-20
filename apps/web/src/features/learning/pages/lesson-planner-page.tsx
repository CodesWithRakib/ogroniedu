'use client';

import React from 'react';
import { BookOpen, FileUp, Link2, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
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
  Input,
  Label,
  LoadingSpinner,
  NativeSelect,
  Textarea,
} from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { parseOffsetCollection } from '@/lib/api/parse';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import {
  useArchiveLessonPlanMutation,
  useCreateLessonPlanMutation,
  useCreateLinkMaterialMutation,
  useListLessonPlansQuery,
  usePublishLessonPlanMutation,
  usePublishMaterialMutation,
  useUploadMaterialMutation,
  type LessonPlanRecord,
} from '@/store/services/learning-api';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** Tutor-authored reusable lesson content. Drafts are never exposed to learners. */
export function LessonPlannerPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).learning;
  const requests = useGetBookingRequestsQuery();
  const bookings = React.useMemo(() => {
    const items = requests.data
      ? parseOffsetCollection<{ id: string; subject?: { name?: string } }>(requests.data).items
      : [];
    return items;
  }, [requests.data]);

  const [bookingId, setBookingId] = React.useState('');
  React.useEffect(() => {
    if (!bookingId && bookings[0]) setBookingId(bookings[0].id);
  }, [bookingId, bookings]);

  const plans = useListLessonPlansQuery({ bookingId, pageSize: 50 }, { skip: !bookingId });
  const [createPlan, { isLoading: creating }] = useCreateLessonPlanMutation();
  const [publishPlan] = usePublishLessonPlanMutation();
  const [archivePlan] = useArchiveLessonPlanMutation();
  const [uploadMaterial, { isLoading: uploading }] = useUploadMaterialMutation();
  const [createLink] = useCreateLinkMaterialMutation();
  const [publishMaterial] = usePublishMaterialMutation();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [objectives, setObjectives] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = React.useState<
    Record<string, { title: string; url: string }>
  >({});
  const fileInputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const failure = (err: unknown) => setError(normalizeUnknownError(err, locale).message);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookingId || title.trim().length < 3) return;
    setError(null);
    try {
      await createPlan({
        bookingId,
        title: title.trim(),
        description: description.trim() || undefined,
        objectives: objectives
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }).unwrap();
      setTitle('');
      setDescription('');
      setObjectives('');
    } catch (err) {
      failure(err);
    }
  };

  const handleFile = async (plan: LessonPlanRecord, file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(t.fileTooLarge);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(locale === 'bn' ? 'এই ফাইল ধরন সমর্থিত নয়।' : 'Unsupported file type.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      await uploadMaterial({
        bookingId,
        lessonPlanId: plan.id,
        title: file.name,
        originalFilename: file.name,
        mediaType: file.type,
        sizeBytes: file.size,
        contentBase64,
      }).unwrap();
    } catch (err) {
      failure(err);
    }
  };

  const handleLink = async (plan: LessonPlanRecord) => {
    const draft = linkDrafts[plan.id];
    if (!draft?.title.trim() || !/^https:\/\//i.test(draft.url)) {
      setError(t.externalLinkLabel);
      return;
    }
    setError(null);
    try {
      await createLink({
        bookingId,
        lessonPlanId: plan.id,
        title: draft.title.trim(),
        externalUrl: draft.url.trim(),
      }).unwrap();
      setLinkDrafts((prev) => ({ ...prev, [plan.id]: { title: '', url: '' } }));
    } catch (err) {
      failure(err);
    }
  };

  const items = plans.data?.data ?? [];

  return (
    <DashboardShell locale={locale}>
      <div className="space-y-6" data-testid="lesson-planner">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">{t.lessonPlans}</h1>
            <p className="text-xs text-muted-foreground">{t.planDescriptionLabel}</p>
          </div>
          <NativeSelect
            aria-label={t.title}
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            wrapperClassName="w-full sm:w-80"
            className="text-xs"
          >
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.subject?.name ?? booking.id.slice(0, 8)}
              </option>
            ))}
          </NativeSelect>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription role="alert">{error}</AlertDescription>
          </Alert>
        )}

        {bookings.length === 0 ? (
          <EmptyState title={t.noLessonPlans} description={t.lessonPlans} />
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{t.createLessonPlan}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="plan-title" className="text-xs">
                      {t.planTitleLabel}
                    </Label>
                    <Input
                      id="plan-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan-description" className="text-xs">
                      {t.planDescriptionLabel}
                    </Label>
                    <Textarea
                      id="plan-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan-objectives" className="text-xs">
                      {t.planObjectivesLabel}
                    </Label>
                    <Textarea
                      id="plan-objectives"
                      value={objectives}
                      onChange={(event) => setObjectives(event.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <Button type="submit" size="sm" isLoading={creating}>
                    <Plus className="w-4 h-4" />
                    {t.createLessonPlan}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {plans.isLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <EmptyState title={t.noLessonPlans} description={t.lessonPlans} />
            ) : (
              <div className="space-y-4">
                {items.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          {plan.title}
                        </CardTitle>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{plan.status}</Badge>
                        {plan.status !== 'published' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void publishPlan(plan.id).unwrap().catch(failure)}
                          >
                            {t.publishAction}
                          </Button>
                        )}
                        {plan.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void archivePlan(plan.id).unwrap().catch(failure)}
                          >
                            {t.archiveAction}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {plan.objectives.length > 0 && (
                        <ul className="list-disc pl-5 text-xs text-muted-foreground">
                          {plan.objectives.map((objective) => (
                            <li key={objective}>{objective}</li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">{t.materials}</p>
                        {plan.materials.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">{t.noMaterials}</p>
                        ) : (
                          plan.materials.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                            >
                              <span className="text-xs truncate">{material.title}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{material.status}</Badge>
                                {material.status !== 'published' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void publishMaterial(material.id).unwrap().catch(failure)
                                    }
                                  >
                                    {t.publishAction}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}

                        <div className="flex flex-wrap items-end gap-2 pt-1">
                          <input
                            ref={(node) => {
                              fileInputs.current[plan.id] = node;
                            }}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleFile(plan, file);
                              event.target.value = '';
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={uploading}
                            onClick={() => fileInputs.current[plan.id]?.click()}
                          >
                            <FileUp className="w-3.5 h-3.5" />
                            {t.uploadMaterial}
                          </Button>
                          <Input
                            value={linkDrafts[plan.id]?.title ?? ''}
                            onChange={(event) =>
                              setLinkDrafts((prev) => ({
                                ...prev,
                                [plan.id]: {
                                  title: event.target.value,
                                  url: prev[plan.id]?.url ?? '',
                                },
                              }))
                            }
                            placeholder={t.materialTitleLabel}
                            className="h-8 w-40 text-xs"
                          />
                          <Input
                            value={linkDrafts[plan.id]?.url ?? ''}
                            onChange={(event) =>
                              setLinkDrafts((prev) => ({
                                ...prev,
                                [plan.id]: {
                                  title: prev[plan.id]?.title ?? '',
                                  url: event.target.value,
                                },
                              }))
                            }
                            placeholder={t.externalLinkLabel}
                            className="h-8 w-56 text-xs"
                          />
                          <Button size="sm" variant="outline" onClick={() => void handleLink(plan)}>
                            <Link2 className="w-3.5 h-3.5" />
                            {t.addMaterial}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
