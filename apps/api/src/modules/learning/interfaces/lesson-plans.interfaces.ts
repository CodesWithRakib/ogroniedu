import type { LessonPlanStatus, LessonPlanStep } from '../entities/lesson-plan.entity';

export interface LessonPlanView {
  id: string;
  bookingId: string;
  sessionId: string | null;
  tutorUserId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  objectives: string[];
  steps: LessonPlanStep[];
  status: LessonPlanStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  materials: Array<{
    id: string;
    kind: 'file' | 'link';
    title: string;
    description: string | null;
    status: string;
    externalUrl: string | null;
    fileName: string | null;
    mediaType: string | null;
    sizeBytes: string | null;
    publishedAt: string | null;
  }>;
}
