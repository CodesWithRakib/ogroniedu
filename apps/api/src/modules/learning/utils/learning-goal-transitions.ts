import { BadRequestException } from '@nestjs/common';
import type { LearningGoalStatus } from '../entities/learning-goal.entity';

export const LEARNING_GOAL_TRANSITIONS: Readonly<
  Record<LearningGoalStatus, readonly LearningGoalStatus[]>
> = {
  open: ['in_progress', 'achieved', 'not_achieved', 'cancelled'],
  in_progress: ['open', 'achieved', 'not_achieved', 'cancelled'],
  achieved: [],
  not_achieved: [],
  cancelled: [],
};

export function canTransitionGoal(from: LearningGoalStatus, to: LearningGoalStatus): boolean {
  if (from === to) return true;
  return LEARNING_GOAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertGoalTransition(from: LearningGoalStatus, to: LearningGoalStatus): void {
  if (!canTransitionGoal(from, to)) {
    throw new BadRequestException(`Invalid learning goal transition: '${from}' -> '${to}'.`);
  }
}

export function isTerminalGoal(status: LearningGoalStatus): boolean {
  return LEARNING_GOAL_TRANSITIONS[status].length === 0;
}
