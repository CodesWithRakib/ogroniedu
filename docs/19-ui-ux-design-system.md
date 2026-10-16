# 19 — UI/UX and Design System

Mobile-first, task-focused, accessible, calm visual style. Avoid excessive colors, gradients, shadows and scattered hardcoded colors. Centralize semantic tokens: background, surface, text, muted, border, primary, success, warning, danger, focus, overlay. Check contrast against current WCAG guidance.

Route groups: public home/search/profile/how-it-works/pricing/safety/FAQ/support/policies; auth; guardian overview/children/search/requests/bookings/calendar/attendance/progress/payments/support; student schedule/homework/assessments/progress/resources; tutor profile/verification/availability/requests/bookings/sessions/homework/reports/earnings/reviews; admin verification/users/bookings/disputes/reconciliation/support/reference data/audit/settings. Optional organization routes only if approved.

Every interactive component needs accessible names/focus/keyboard support. Forms need labels, inline errors and summaries. Tables need a mobile strategy. Status must not rely on color alone. Dialogs trap/restore focus. Support reduced motion, realistic Bangla text lengths, locale-aware dates/currency and complete loading/empty/error/success/permission/offline states. No production mock arrays.
