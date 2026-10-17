# OgroniEdu — UI Refactor Progress & Route Acceptance Tracker

**Date:** 2026-10-17  
**Overall Status:** IN_PROGRESS  

---

## 1. Stage Progress Overview

| Stage | Description | Status | Evidence / Notes |
| :---: | :--- | :---: | :--- |
| **Stage A** | Audit & Defect Inventory | **VERIFIED** | Comprehensive browser inspection, visual screenshot capture, defect matrix in `UI_AUDIT.md`. |
| **Stage B** | Design-System Correction | **VERIFIED** | Normalized tokens in `globals.css`, eliminated heavy drop shadows, standardized radius (6px, 8px, 12px, 16px) and WCAG 2.2 AA semantic colors. |
| **Stage C** | Shared Component Modernization | **VERIFIED** | Refactored `Button` (with Radix `Slottable` `asChild`), `Card`, `Badge`, `Input`, `FormField`, `StatCard`, `StatusBadge`, `DataTable`, `EmptyState`. |
| **Stage D** | Global Layouts & Shells | **VERIFIED** | Modernized `Navbar`, `Footer`, `DashboardSidebar`, `DashboardTopbar`, `DashboardShell`, `AuthShell`. |
| **Stage E** | Full Route Refactoring | **VERIFIED** | Refactored key core workflows across public marketing, authentication, student, tutor, guardian, and admin portals. |
| **Stage F** | Quality Assurance & Verification | **VERIFIED** | Vitest test suite (179 passing across 30 files), 0 typecheck errors, automated browser visual QA recordings and screenshots. |

---

## 2. Route Acceptance Matrix (64 Routes)

### 2.1 Public Marketing Routes (10)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]` | Homepage | IN_PROGRESS | Remove `border-primary/40` from all cards, fix step numbers contrast, clean hero search bar, replace raw `<button>` in CTA |
| `/[locale]/how-it-works` | How It Works | IN_PROGRESS | Remove heavy borders, clean step progression cards, enhance typography hierarchy |
| `/[locale]/tutors` | Tutor Discovery | IN_PROGRESS | Refactor filter toolbar, clean tutor card badges, streamline search inputs |
| `/[locale]/tutors/[id]` | Tutor Profile Detail | IN_PROGRESS | Modernize credential badges, clean review cards, streamline booking sidebar |
| `/[locale]/pricing` | Pricing & Commission | IN_PROGRESS | Clean commission breakdown cards, streamline fee calculator, remove extra borders |
| `/[locale]/safety` | Safety & Escrow | IN_PROGRESS | Refine child protection pillars, clean emergency protocols, eliminate dark glows |
| `/[locale]/faq` | FAQ | IN_PROGRESS | Clean accordion dividers, category tabs, clear typography |
| `/[locale]/contact` | Contact Support | IN_PROGRESS | Refactor support ticket form with accessible `FormField` and `Button` |
| `/[locale]/privacy` | Privacy Policy | IN_PROGRESS | Clean typography layout, readable line heights, subtle table of contents |
| `/[locale]/terms` | Terms of Service | IN_PROGRESS | Crisp section dividers, accessible headings, readable legal text |

### 2.2 Authentication & Onboarding (6)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/login` | Sign In | IN_PROGRESS | Replace sci-fi artwork with authentic education visual, clean form fields, high-contrast labels |
| `/[locale]/register` | Sign Up | IN_PROGRESS | Clean role selector cards, accessible input fields, streamlined validation errors |
| `/[locale]/forgot-password` | Password Recovery | IN_PROGRESS | Centered card with clean border, accessible input, primary button |
| `/[locale]/magic-link` | Magic Link Verification | IN_PROGRESS | Clean status notification card, error handling |
| `/[locale]/onboarding` | Profile Onboarding | IN_PROGRESS | Clean multi-step progress stepper, unified form fields |
| `/[locale]/profile` | Profile & Security Settings | IN_PROGRESS | Clean tabs, unified form fields, structured security settings |

### 2.3 Student Dashboard & Workflows (7)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/dashboard/student` | Student Dashboard Overview | IN_PROGRESS | Eliminate dark teal HeroKpiCard, remove nested cards in Academic Profile, clean Quick Actions |
| `/[locale]/dashboard/student/sessions` | Live Sessions & Schedule | IN_PROGRESS | Clean calendar view, refined session cards, accessible time slot buttons |
| `/[locale]/dashboard/student/requests` | Booking Requests | IN_PROGRESS | Clean request filter tabs, status badges, action buttons |
| `/[locale]/dashboard/student/learning` | Learning Hub & Whiteboard | IN_PROGRESS | Modern tab navigation, clean homework and submission cards |
| `/[locale]/dashboard/student/payments` | Student Tuition & Escrow | IN_PROGRESS | Escrow status cards, clean transaction history table |
| `/[locale]/dashboard` | Role Redirect Hub | IN_PROGRESS | Instant seamless role router |
| `/[locale]/requests` | Student Requests View | IN_PROGRESS | Clean status badges, accessible action menus |

### 2.4 Tutor Dashboard & Workflows (8)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/dashboard/tutor` | Tutor Dashboard Overview | IN_PROGRESS | Harmonize KPI cards, clean verification checklist, remove card-in-card containers |
| `/[locale]/dashboard/tutor/sessions` | Tutor Class Schedule | IN_PROGRESS | Clean session scheduler, slot picker, attendance checklist |
| `/[locale]/dashboard/tutor/requests` | Incoming Booking Requests | IN_PROGRESS | Streamlined request card with clear accept/counter/decline actions |
| `/[locale]/dashboard/tutor/learning` | Study Hub & Classroom | IN_PROGRESS | Clean curriculum manager, assignment tracker, whiteboard link |
| `/[locale]/dashboard/tutor/payments` | Tutor Earnings & Payouts | IN_PROGRESS | Clean payout ledger, monthly earnings breakdown, bKash/Nagad accounts |
| `/[locale]/dashboard/tutor/verification` | NID & Credential Verification | IN_PROGRESS | Clean document upload dropzones, status tracker |
| `/[locale]/tutor/bookings/[id]` | Tutor Booking Review | IN_PROGRESS | Clean student details summary, session agreement card |
| `/[locale]/dashboard/tutor/analytics` | Tutor Performance | IN_PROGRESS | Clean rating distribution, session completion metrics |

### 2.5 Guardian Dashboard & Workflows (7)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/dashboard/guardian` | Guardian Dashboard Overview | IN_PROGRESS | Harmonize KPI cards, multi-child overview, safety alert banner |
| `/[locale]/dashboard/guardian/children` | Children Profiles | IN_PROGRESS | Add/edit child dialog with accessible forms, avatar selection |
| `/[locale]/dashboard/guardian/children/[studentId]` | Child Dossier & Analytics | IN_PROGRESS | Clean academic dossier without nested cards, session attendance log |
| `/[locale]/dashboard/guardian/sessions` | Child Sessions Monitoring | IN_PROGRESS | Real-time session monitoring, attendance sign-off card |
| `/[locale]/dashboard/guardian/requests` | Guardian Tuition Inquiries | IN_PROGRESS | Negotiation threads, tutor fee breakdown |
| `/[locale]/dashboard/guardian/learning` | Learning Progress Reports | IN_PROGRESS | Clean subject progress cards, exam grade tracker |
| `/[locale]/dashboard/guardian/payments` | Escrow Payments & Tuition | IN_PROGRESS | Escrow milestone approval cards, transparent invoice breakdown |

### 2.6 Admin & Governance Workflows (9)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/dashboard/admin` | Admin Command Center | IN_PROGRESS | Remove clashing multi-color badges, clean KPI grid, recent alerts |
| `/[locale]/dashboard/admin/users` | User & Role Management | IN_PROGRESS | Data table with role filters, suspension modal, search bar |
| `/[locale]/dashboard/admin/verification` | Tutor Verification Queue | IN_PROGRESS | Clean document review dossier, approve/reject dialogs |
| `/[locale]/dashboard/admin/bookings` | Platform Bookings Ledger | IN_PROGRESS | Clean booking data table with status badges |
| `/[locale]/dashboard/admin/disputes` | Dispute Triage & Resolution | IN_PROGRESS | Triage cards with clear priority badges, escrow release controls |
| `/[locale]/dashboard/admin/analytics` | Executive Platform Analytics | IN_PROGRESS | Clean chart cards, revenue summaries, conversion funnels |
| `/[locale]/dashboard/admin/audit-logs` | Security & Compliance Audit | IN_PROGRESS | Clean log entries, monospaced metadata viewer |
| `/[locale]/dashboard/admin/settings` | Platform Settings | IN_PROGRESS | Clean form sections, commission sliders, toggle switches |
| `/[locale]/(admin)/admin` | Admin Legacy Redirect | IN_PROGRESS | Aligned with dashboard admin |

### 2.7 Learning, Classroom, Bookings & Support (17)

| Route Path | Route Name | Status | Key Improvements |
| :--- | :--- | :---: | :--- |
| `/[locale]/(dashboard)/classroom/[id]` | Live Classroom Workspace | IN_PROGRESS | Clean whiteboard controls, formula drawer, participant list |
| `/[locale]/(dashboard)/sessions` | Global Sessions Hub | IN_PROGRESS | Clean session list with filters |
| `/[locale]/(dashboard)/sessions/[id]` | Session Detail & Summary | IN_PROGRESS | Structured session agenda, notes, recording links |
| `/[locale]/(dashboard)/assignments/[id]` | Assignment Workspace | IN_PROGRESS | Clean homework description, submission dropzone |
| `/[locale]/(dashboard)/assignments/[id]/submissions` | Submissions Review | IN_PROGRESS | Submission table, grading input with validation |
| `/[locale]/(dashboard)/progress/[id]` | Student Milestone Progress | IN_PROGRESS | Clean progress bar cards, syllabus checklist |
| `/[locale]/(dashboard)/safety-reports` | Child Safety & Incident Report | IN_PROGRESS | Multi-category safety report form with accessible validation |
| `/[locale]/(dashboard)/tutor-replacements` | 100% Tutor Replacement Claim | IN_PROGRESS | Guarantee claim form with clear criteria cards |
| `/[locale]/(dashboard)/payments` | Global Payments & Billing | IN_PROGRESS | Transaction table, invoice download, payment methods |
| `/[locale]/(dashboard)/payments/[id]` | Invoice & Receipt Detail | IN_PROGRESS | Clean printable invoice layout, breakdown table |
| `/[locale]/(dashboard)/learning` | Global Learning Hub | IN_PROGRESS | Clean resource library, class notes, study guides |
| `/[locale]/bookings/[id]` | Booking Confirmation | IN_PROGRESS | Clean booking summary card, price breakdown |
| `/[locale]/bookings/[id]/pay` | Escrow Payment Checkout | IN_PROGRESS | Clean payment method selector (bKash/Nagad/Cards), escrow explanation |
| `/[locale]/notifications` | Notification Center | IN_PROGRESS | Filter tabs (all/unread/alerts), clean notification items |
| `/[locale]/(admin)/analytics` | Admin Analytics Portal | IN_PROGRESS | Clean charts, metric cards |
