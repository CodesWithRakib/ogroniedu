/** Public-facing review projection. Never carries reviewer contact details. */
export interface PublicReviewView {
  id: string;
  rating: number;
  punctualityRating: number | null;
  teachingClarityRating: number | null;
  subjectMasteryRating: number | null;
  comment: string;
  commentEn?: string | null;
  commentBn?: string | null;
  isVerifiedBooking: boolean;
  tutorResponse: string | null;
  tutorResponseEn?: string | null;
  tutorResponseBn?: string | null;
  tutorRespondedAt: string | null;
  createdAt: string;
  reviewerDisplayName: string | null;
  reviewerDisplayNameEn?: string | null;
  reviewerDisplayNameBn?: string | null;
  moderationStatus?: string;
}
