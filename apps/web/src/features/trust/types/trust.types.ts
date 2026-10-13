export interface ReviewItem {
  id: string;
  rating: number;
  punctualityRating?: number | null;
  teachingClarityRating?: number | null;
  subjectMasteryRating?: number | null;
  comment: string;
  isVerifiedBooking: boolean;
  tutorResponse?: string | null;
  tutorRespondedAt?: string | null;
  createdAt: string;
  reviewer?: {
    displayName?: string;
  };
}

export interface TutorReviewsListViewProps {
  tutorId: string;
  reviews: ReviewItem[];
  currentUserId?: string;
  isCurrentTutor?: boolean;
  onReply?: (reviewId: string, reply: string) => Promise<unknown>;
}

export interface ReviewSubmitPayload {
  bookingId: string;
  rating: number;
  punctualityRating: number;
  teachingClarityRating: number;
  subjectMasteryRating: number;
  comment: string;
}

export interface ReviewFormModalProps {
  bookingId: string;
  tutorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (review: unknown) => void;
  onSubmitReview?: (payload: ReviewSubmitPayload) => Promise<unknown>;
}

export interface SafetyReportSubmitPayload {
  reportedUserId?: string;
  bookingId?: string;
  category: string;
  severity: string;
  description: string;
}

export interface SafetyReportModalProps {
  reportedUserId?: string;
  bookingId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSuccess?: (report: unknown) => void;
  onSubmitReport?: (payload: SafetyReportSubmitPayload) => Promise<unknown>;
}

export interface ReplacementSubmitPayload {
  bookingId: string;
  reasonCode: string;
  explanation: string;
}

export interface TutorReplacementModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestSuccess?: (caseData: unknown) => void;
  onSubmitReplacement?: (payload: ReplacementSubmitPayload) => Promise<unknown>;
}
