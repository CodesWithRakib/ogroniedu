export interface LearningMaterialView {
  id: string;
  bookingId: string;
  lessonPlanId: string | null;
  sessionId: string | null;
  assignmentId: string | null;
  kind: 'file' | 'link';
  title: string;
  description: string | null;
  status: string;
  externalUrl: string | null;
  fileName: string | null;
  mediaType: string | null;
  sizeBytes: string | null;
  publishedAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
}

export interface MaterialDownload {
  buffer: Buffer;
  filename: string;
  mediaType: string;
}
