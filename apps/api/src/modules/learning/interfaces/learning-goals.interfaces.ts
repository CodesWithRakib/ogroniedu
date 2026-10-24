import type { LearningGoalStatus } from '../entities/learning-goal.entity';

export interface LearningGoalView {
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
