import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantUserId: string;
  attendanceStatus: AttendanceStatus;
  recordedAt: string;
  notes?: string | null;
}

export interface AssignmentRecord {
  id: string;
  bookingId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  maxScore: number;
  status: string;
  submission?: {
    id: string;
    studentUserId: string;
    submissionText?: string | null;
    status: string;
    score?: number | null;
    maxScore?: number | null;
    tutorFeedback?: string | null;
    reviewedAt?: string | null;
  } | null;
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

export const learningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    markAttendance: builder.mutation<
      ApiSuccessEnvelope<AttendanceRecord>,
      { sessionId: string; participantUserId: string; attendanceStatus: AttendanceStatus; notes?: string }
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
    createAssignment: builder.mutation<
      ApiSuccessEnvelope<AssignmentRecord>,
      { bookingId: string; title: string; instructions?: string; dueAt?: string; maxScore: number }
    >({
      query: (body) => ({ url: '/api/v1/learning/assignments', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Assignment', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    submitAssignment: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { assignmentId: string; submissionText: string }
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
    gradeSubmission: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { submissionId: string; score: number; tutorFeedback?: string; revisionReason?: string }
    >({
      query: ({ submissionId, ...body }) => ({
        url: `/api/v1/learning/submissions/${submissionId}/grade`,
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
    getStudentLearningSummary: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (studentUserId) => `/api/v1/learning/students/${studentUserId}/summary`,
      providesTags: (_r, _e, id) => [{ type: 'LearningSummary', id }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useMarkAttendanceMutation,
  useGetSessionAttendanceQuery,
  useCreateAssignmentMutation,
  useSubmitAssignmentMutation,
  useGradeSubmissionMutation,
  useGenerateProgressReportMutation,
  useGetBookingLearningRecordsQuery,
  useGetStudentLearningSummaryQuery,
} = learningApi;
