'use client';

/**
 * Backwards-compatible import path for the learning management view.
 * The implementation lives in `@/features/learning`; this module is a thin
 * composer so existing routes and specs keep compiling unchanged.
 */
import { LearningManagementView as LearningManagementViewImpl } from '@/features/learning/components/learning-management-view';

export { LearningManagementViewImpl as LearningManagementView };
export default LearningManagementViewImpl;
export type { LearningManagementViewProps } from '@/features/learning/types/learning.types';
