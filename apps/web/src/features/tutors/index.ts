/**
 * Public surface of the tutors feature (owner dashboards + profile cards).
 * Discovery/search UI is canonical in `@/features/tutor-discovery` — this
 * barrel intentionally does NOT re-export it (Phase 23 P2-5: dead wrappers
 * removed). Routes must import from `@/features/tutors`, not deep paths.
 */
export * from './pages/tutor-dashboard-page';
export * from './pages/tutor-details-page';
export * from './pages/tutor-verification-page';
export * from './pages/tutor-earnings-page';
export * from './components/qualificationUploadCard';
