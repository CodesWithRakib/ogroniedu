import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import { toQueryString } from '@/lib/api/query';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type LearningMaterialKind = 'file' | 'link';
export type LearningMaterialStatus = 'draft' | 'published' | 'archived';
export type LessonPlanStatus = 'draft' | 'published' | 'archived';
export type LearningGoalStatus = 'open' | 'in_progress' | 'achieved' | 'not_achieved' | 'cancelled';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantUserId: string;
  attendanceStatus: AttendanceStatus;
  recordedAt: string;
  notes?: string | null;
  correctionReason?: string | null;
  updatedAt?: string;
}

export interface AttendanceSummary {
  studentId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessionsInPeriod: number;
  metrics: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    notRecorded: number;
    recorded: number;
    attended: number;
    attendanceRate: number | null;
    coverage: number | null;
  };
}

export interface StudentAttendanceHistoryItem {
  id: string;
  sessionId: string;
  attendanceStatus: AttendanceStatus;
  notes: string | null;
  correctionReason: string | null;
  recordedAt: string;
  updatedAt: string;
  sessionStartsAt: string | null;
  subjectName: string | null;
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentUserId: string;
  submissionText?: string | null;
  assetIds?: string[];
  submittedAt: string;
  status: 'submitted' | 'late' | 'reviewed' | 'returned';
  workflowState: 'submitted' | 'under_review' | 'reviewed' | 'returned' | 'late';
  attemptCount: number;
  score?: number | null;
  maxScore?: number | null;
  tutorFeedback?: string | null;
  returnReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  canSubmitAgain: boolean;
  studentName?: string;
}

export interface AssignmentRecord {
  id: string;
  bookingId: string;
  sessionId?: string | null;
  tutorUserId?: string;
  studentUserId?: string;
  subjectId?: string | null;
  title: string;
  topic?: string | null;
  instructions?: string | null;
  dueAt?: string | null;
  maxScore: number;
  status: string;
  publishedAt?: string | null;
  resubmissionAllowed?: boolean;
  lateSubmissionAllowed?: boolean;
  maxAttempts?: number;
  createdAt?: string;
  submission?: SubmissionRecord | null;
}

export interface ProgressReportRecord {
  id: string;
  bookingId: string;
  periodStart: string;
  periodEnd: string;
  attendanceRate: number;
  assignmentsCompleted: number;
  averageScore?: number | null;
  observableProgress: string;
  areasForGrowth?: string | null;
  tutorRemarks?: string | null;
  generatedAt: string;
}

export interface StudentLearningMetrics {
  totalSessionsRecorded: number;
  sessionsAttended: number;
  attendanceRate: number;
  assignmentsAssigned: number;
  assignmentsCompleted: number;
  averageScore: number | null;
}

export interface StudentSubmissionItem {
  id: string;
  studentUserId: string;
  assignmentId: string;
  submissionText?: string | null;
  status: string;
  score?: number | null;
  maxScore?: number | null;
  tutorFeedback?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  assignment?: AssignmentRecord;
}

export interface StudentLearningSummary {
  studentUserId: string;
  metrics: StudentLearningMetrics;
  attendance: AttendanceRecord[];
  assignments: AssignmentRecord[];
  submissions: StudentSubmissionItem[];
  progressReports: ProgressReportRecord[];
}

export interface LearningMaterialRecord {
  id: string;
  bookingId: string;
  lessonPlanId: string | null;
  sessionId: string | null;
  assignmentId: string | null;
  kind: LearningMaterialKind;
  title: string;
  description: string | null;
  status: LearningMaterialStatus;
  externalUrl: string | null;
  fileName: string | null;
  mediaType: string | null;
  sizeBytes: string | null;
  publishedAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
}

export interface LessonPlanRecord {
  id: string;
  bookingId: string;
  sessionId: string | null;
  tutorUserId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  objectives: string[];
  steps: Array<{ title: string; durationMinutes?: number; notes?: string }>;
  status: LessonPlanStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  materials: LearningMaterialRecord[];
}

export interface LearningGoalRecord {
  id: string;
  bookingId: string;
  studentUserId: string;
  tutorUserId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: LearningGoalStatus;
  evidence: string | null;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProgressRecord {
  studentUserId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessions: { completed: number; upcoming: number; cancelled: number };
  attendance: AttendanceSummary['metrics'] & { sessionsInPeriod: number };
  assignments: {
    published: number;
    submitted: number;
    reviewed: number;
    completionRate: number | null;
    averageScore: number | null;
  };
  attendanceTrend: Array<{ month: string; attendanceRate: number | null; recorded: number }>;
  goals: Array<{ id: string; title: string; status: string; targetDate: string | null }>;
  recentFeedback: Array<{
    submissionId: string;
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number | null;
    feedback: string;
    reviewedAt: string;
  }>;
  latestReport: {
    id: string;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
  } | null;
}

interface LearningListParams {
  bookingId?: string;
  studentId?: string;
  sessionId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const learningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    markAttendance: builder.mutation<
      ApiSuccessEnvelope<AttendanceRecord>,
      {
        sessionId: string;
        participantUserId: string;
        attendanceStatus: AttendanceStatus;
        notes?: string;
        correctionReason?: string;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/attendance', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Attendance', id: 'LIST' },
        { type: 'LearningSummary', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getSessionAttendance: builder.query<ApiSuccessEnvelope<AttendanceRecord[]>, string>({
      query: (sessionId) => `/api/v1/learning/sessions/${sessionId}/attendance`,
      providesTags: (_r, _e, sessionId) => [{ type: 'Attendance', id: sessionId }],
    }),
    getAttendanceSummary: builder.query<
      ApiSuccessEnvelope<AttendanceSummary>,
      { studentId?: string; bookingId?: string; from?: string; to?: string }
    >({
      query: (params) => `/api/v1/learning/attendance/summary${toQueryString(params)}`,
      providesTags: (result, _e, arg) => [
        { type: 'Attendance', id: arg.studentId ?? arg.bookingId ?? 'LIST' },
      ],
    }),
    getStudentAttendance: builder.query<
      ApiSuccessEnvelope<StudentAttendanceHistoryItem[]>,
      { studentId: string } & LearningListParams
    >({
      query: ({ studentId, ...params }) =>
        `/api/v1/learning/students/${studentId}/attendance${toQueryString(params)}`,
      providesTags: (_r, _e, arg) => [{ type: 'Attendance', id: `student-${arg.studentId}` }],
    }),
    createAssignment: builder.mutation<
      ApiSuccessEnvelope<AssignmentRecord>,
      {
        bookingId: string;
        sessionId?: string;
        title: string;
        topic?: string;
        instructions?: string;
        dueAt?: string;
        maxScore?: number;
        publishNow?: boolean;
        resubmissionAllowed?: boolean;
        lateSubmissionAllowed?: boolean;
        maxAttempts?: number;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/assignments', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Assignment', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    listAssignments: builder.query<ApiSuccessEnvelope<AssignmentRecord[]>, LearningListParams | void>({
      query: (params) => `/api/v1/learning/assignments${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((item) => ({ type: 'Assignment' as const, id: item.id })),
              { type: 'Assignment', id: 'LIST' },
            ]
          : [{ type: 'Assignment', id: 'LIST' }],
    }),
    getAssignmentById: builder.query<ApiSuccessEnvelope<AssignmentRecord>, string>({
      query: (assignmentId) => `/api/v1/learning/assignments/${assignmentId}`,
      providesTags: (_r, _e, id) => [{ type: 'Assignment', id }],
    }),
    publishAssignment: builder.mutation<ApiSuccessEnvelope<AssignmentRecord>, string>({
      query: (id) => ({ url: `/api/v1/learning/assignments/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),
    archiveAssignment: builder.mutation<ApiSuccessEnvelope<AssignmentRecord>, string>({
      query: (id) => ({ url: `/api/v1/learning/assignments/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),
    listSubmissions: builder.query<ApiSuccessEnvelope<SubmissionRecord[]>, string>({
      query: (assignmentId) => `/api/v1/learning/assignments/${assignmentId}/submissions`,
      providesTags: (_r, _e, assignmentId) => [{ type: 'Submission', id: assignmentId }],
    }),
    submitAssignment: builder.mutation<
      ApiSuccessEnvelope<SubmissionRecord>,
      { assignmentId: string; submissionText?: string; assetIds?: string[] }
    >({
      query: ({ assignmentId, ...body }) => ({
        url: `/api/v1/learning/assignments/${assignmentId}/submissions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Assignment', id: 'LIST' },
        { type: 'Submission', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getSubmission: builder.query<ApiSuccessEnvelope<SubmissionRecord>, string>({
      query: (submissionId) => `/api/v1/learning/submissions/${submissionId}`,
      providesTags: (_r, _e, id) => [{ type: 'Submission', id }],
    }),
    listSubmissionRevisions: builder.query<
      ApiSuccessEnvelope<Array<Record<string, unknown>>>,
      string
    >({
      query: (submissionId) => `/api/v1/learning/submissions/${submissionId}/revisions`,
      providesTags: (_r, _e, id) => [{ type: 'Submission', id: `${id}-revisions` }],
    }),
    gradeSubmission: builder.mutation<
      ApiSuccessEnvelope<SubmissionRecord>,
      { submissionId: string; score: number; tutorFeedback?: string; revisionReason?: string }
    >({
      query: ({ submissionId, ...body }) => ({
        url: `/api/v1/learning/submissions/${submissionId}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Submission', id: 'LIST' },
        { type: 'Assignment', id: 'LIST' },
        { type: 'LearningSummary', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    returnSubmission: builder.mutation<
      ApiSuccessEnvelope<SubmissionRecord>,
      { submissionId: string; returnReason: string; tutorFeedback?: string }
    >({
      query: ({ submissionId, ...body }) => ({
        url: `/api/v1/learning/submissions/${submissionId}/return`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Submission', id: 'LIST' },
        { type: 'Assignment', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    createLessonPlan: builder.mutation<
      ApiSuccessEnvelope<LessonPlanRecord>,
      {
        bookingId: string;
        sessionId?: string;
        title: string;
        description?: string;
        objectives?: string[];
        steps?: Array<{ title: string; durationMinutes?: number; notes?: string }>;
        publishNow?: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/lesson-plans', method: 'POST', body }),
      invalidatesTags: [{ type: 'LessonPlan', id: 'LIST' }],
    }),
    listLessonPlans: builder.query<ApiSuccessEnvelope<LessonPlanRecord[]>, LearningListParams | void>({
      query: (params) => `/api/v1/learning/lesson-plans${toQueryString(params ?? {})}`,
      providesTags: [{ type: 'LessonPlan', id: 'LIST' }],
    }),
    getLessonPlan: builder.query<ApiSuccessEnvelope<LessonPlanRecord>, string>({
      query: (id) => `/api/v1/learning/lesson-plans/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'LessonPlan', id }],
    }),
    updateLessonPlan: builder.mutation<
      ApiSuccessEnvelope<LessonPlanRecord>,
      { id: string; title?: string; description?: string; objectives?: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/learning/lesson-plans/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'LessonPlan', id },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    publishLessonPlan: builder.mutation<ApiSuccessEnvelope<LessonPlanRecord>, string>({
      query: (id) => ({ url: `/api/v1/learning/lesson-plans/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'LessonPlan', id },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    archiveLessonPlan: builder.mutation<ApiSuccessEnvelope<LessonPlanRecord>, string>({
      query: (id) => ({ url: `/api/v1/learning/lesson-plans/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'LessonPlan', id },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    getSessionLessonPlan: builder.query<ApiSuccessEnvelope<LessonPlanRecord | null>, string>({
      query: (sessionId) => `/api/v1/learning/sessions/${sessionId}/lesson-plan`,
      providesTags: (_r, _e, sessionId) => [{ type: 'LessonPlan', id: `session-${sessionId}` }],
    }),
    listSessionMaterials: builder.query<ApiSuccessEnvelope<LearningMaterialRecord[]>, string>({
      query: (sessionId) => `/api/v1/learning/sessions/${sessionId}/materials`,
      providesTags: (_r, _e, sessionId) => [{ type: 'Material', id: `session-${sessionId}` }],
    }),
    listBookingMaterials: builder.query<
      ApiSuccessEnvelope<LearningMaterialRecord[]>,
      { bookingId: string } & LearningListParams
    >({
      query: ({ bookingId, ...params }) =>
        `/api/v1/learning/bookings/${bookingId}/materials${toQueryString(params)}`,
      providesTags: (_r, _e, arg) => [{ type: 'Material', id: arg.bookingId }],
    }),
    uploadMaterial: builder.mutation<
      ApiSuccessEnvelope<LearningMaterialRecord>,
      {
        bookingId: string;
        lessonPlanId?: string;
        sessionId?: string;
        assignmentId?: string;
        title: string;
        description?: string;
        originalFilename: string;
        mediaType: string;
        sizeBytes: number;
        contentBase64: string;
        publishNow?: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/materials/upload', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Material', id: 'LIST' },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    createLinkMaterial: builder.mutation<
      ApiSuccessEnvelope<LearningMaterialRecord>,
      {
        bookingId: string;
        lessonPlanId?: string;
        sessionId?: string;
        assignmentId?: string;
        title: string;
        description?: string;
        externalUrl: string;
        publishNow?: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/materials/link', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Material', id: 'LIST' },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    publishMaterial: builder.mutation<ApiSuccessEnvelope<LearningMaterialRecord>, string>({
      query: (id) => ({ url: `/api/v1/learning/materials/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Material', id },
        { type: 'Material', id: 'LIST' },
        { type: 'LessonPlan', id: 'LIST' },
      ],
    }),
    createLearningGoal: builder.mutation<
      ApiSuccessEnvelope<LearningGoalRecord>,
      { bookingId: string; title: string; description?: string; targetDate?: string }
    >({
      query: (body) => ({ url: '/api/v1/learning/goals', method: 'POST', body }),
      invalidatesTags: [{ type: 'LearningGoal', id: 'LIST' }],
    }),
    listLearningGoals: builder.query<
      ApiSuccessEnvelope<LearningGoalRecord[]>,
      { studentId?: string; bookingId?: string; status?: LearningGoalStatus } | void
    >({
      query: (params) => `/api/v1/learning/goals${toQueryString(params ?? {})}`,
      providesTags: [{ type: 'LearningGoal', id: 'LIST' }],
    }),
    updateLearningGoal: builder.mutation<
      ApiSuccessEnvelope<LearningGoalRecord>,
      { id: string; status?: LearningGoalStatus; evidence?: string; title?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/learning/goals/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'LearningGoal', id: 'LIST' }],
    }),
    generateProgressReport: builder.mutation<
      ApiSuccessEnvelope<ProgressReportRecord>,
      {
        bookingId: string;
        periodStart: string;
        periodEnd: string;
        observableProgress: string;
        areasForGrowth?: string;
        tutorRemarks?: string;
      }
    >({
      query: (body) => ({ url: '/api/v1/learning/progress-reports', method: 'POST', body }),
      invalidatesTags: [
        { type: 'ProgressReport', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getBookingLearningRecords: builder.query<
      ApiSuccessEnvelope<{
        attendance: AttendanceRecord[];
        assignments: AssignmentRecord[];
        reports: ProgressReportRecord[];
      }>,
      string
    >({
      query: (bookingId) => `/api/v1/learning/bookings/${bookingId}`,
      providesTags: (_r, _e, bookingId) => [
        { type: 'Attendance', id: bookingId },
        { type: 'Assignment', id: bookingId },
        { type: 'ProgressReport', id: bookingId },
      ],
    }),
    getProgressReportById: builder.query<ApiSuccessEnvelope<ProgressReportRecord>, string>({
      query: (reportId) => `/api/v1/learning/progress-reports/${reportId}`,
      providesTags: (_r, _e, id) => [{ type: 'ProgressReport', id }],
    }),
    getStudentLearningSummary: builder.query<ApiSuccessEnvelope<StudentLearningSummary>, string>({
      query: (studentUserId) => `/api/v1/learning/students/${studentUserId}/summary`,
      providesTags: (_r, _e, id) => [{ type: 'LearningSummary', id }],
    }),
    getStudentProgress: builder.query<
      ApiSuccessEnvelope<StudentProgressRecord>,
      { studentId: string; bookingId?: string; from?: string; to?: string }
    >({
      query: ({ studentId, ...params }) =>
        `/api/v1/learning/students/${studentId}/progress${toQueryString(params)}`,
      providesTags: (_r, _e, arg) => [{ type: 'LearningSummary', id: `progress-${arg.studentId}` }],
    }),
    getAdminLmsSessions: builder.query<
      ApiSuccessEnvelope<Array<Record<string, unknown>>>,
      {
        tutorId?: string;
        studentId?: string;
        bookingId?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
      }
    >({
      query: (params) => `/api/v1/learning/admin/sessions${toQueryString(params)}`,
      providesTags: [{ type: 'Session', id: 'ADMIN' }],
    }),
    getAdminLmsOverview: builder.query<
      ApiSuccessEnvelope<{
        periodStart: string;
        periodEnd: string;
        sessions: { total: number; completed: number; cancelled: number; scheduled: number };
        attendance: { recorded: number; attended: number };
        homework: { publishedAssignments: number; submissions: number };
      }>,
      { from?: string; to?: string } | void
    >({
      query: (params) => `/api/v1/learning/admin/overview${toQueryString(params ?? {})}`,
      providesTags: [{ type: 'Session', id: 'ADMIN' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useMarkAttendanceMutation,
  useGetSessionAttendanceQuery,
  useGetAttendanceSummaryQuery,
  useGetStudentAttendanceQuery,
  useCreateAssignmentMutation,
  useListAssignmentsQuery,
  useGetAssignmentByIdQuery,
  usePublishAssignmentMutation,
  useArchiveAssignmentMutation,
  useListSubmissionsQuery,
  useSubmitAssignmentMutation,
  useGetSubmissionQuery,
  useListSubmissionRevisionsQuery,
  useGradeSubmissionMutation,
  useReturnSubmissionMutation,
  useCreateLessonPlanMutation,
  useListLessonPlansQuery,
  useGetLessonPlanQuery,
  useUpdateLessonPlanMutation,
  usePublishLessonPlanMutation,
  useArchiveLessonPlanMutation,
  useGetSessionLessonPlanQuery,
  useListSessionMaterialsQuery,
  useListBookingMaterialsQuery,
  useUploadMaterialMutation,
  useCreateLinkMaterialMutation,
  usePublishMaterialMutation,
  useCreateLearningGoalMutation,
  useListLearningGoalsQuery,
  useUpdateLearningGoalMutation,
  useGenerateProgressReportMutation,
  useGetBookingLearningRecordsQuery,
  useGetProgressReportByIdQuery,
  useGetStudentLearningSummaryQuery,
  useGetStudentProgressQuery,
  useGetAdminLmsSessionsQuery,
  useGetAdminLmsOverviewQuery,
} = learningApi;
