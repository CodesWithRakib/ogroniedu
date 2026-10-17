# OgroniEdu — UI Audit & Visual Defect Inventory

**Date:** 2026-10-17  
**Scope:** `apps/web` (Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui)  
**Auditor:** Senior UI/UX Engineer, Staff Frontend Engineer, Design-System Architect & QA

---

## 1. Executive Summary & Root Cause Analysis

While a light theme conversion was executed previously (removing dark mode tokens, theme switchers, and dark-first utility classes), the actual rendered application still suffered from severe visual, architectural, and design-system defects:

1. **"One Color Plastered Everywhere" Anti-Pattern:**
   - Over **56 files** directly stamped `border-primary/40` on cards, badges, section dividers, hero buttons, and form selectors.
   - The signature Ocean Teal / deep teal token was applied indiscriminately to borders, backgrounds, icons, pills, numbers, and headings, destroying contrast and visual hierarchy.
   - Semantic status tokens were confused: `Badge` and `StatusBadge` mapped `success` to `primary` (teal-700) rather than true accessible green (`#15803d`).

2. **Excessive Borders, Drop Shadows, and Nested Containers:**
   - Cards frequently compounded three elevations: an outer container with `border border-border/70` and `shadow-xs`, enclosing a grid of mini-cards with `border border-border/40 bg-surface/50`, enclosing sub-pills with `border border-primary/40`.
   - The student academic profile contained 5 nested bordered boxes inside one card.
   - StatCard variants used jarring dark gradients (`bg-gradient-to-br from-primary via-primary/95 to-primary-hover`) for one card while adjacent cards used bordered white cards with drop shadows.
   - Quick action strips were wrapped in full bordered card wells instead of clean button groups.

3. **Inconsistent Radii & Metric Scales:**
   - Within single screens, elements mixed `rounded-full` (9999px), `rounded-3xl` (24px), `rounded-2xl` (16px), `rounded-xl` (12px), `rounded-lg` (8px), and `rounded-md` without any semantic hierarchy.
   - Headings, card padding, and button heights varied unpredictably between routes.

4. **Typography Contrast & Text Hierarchy Failures:**
   - Subtitles across all dashboard pages were styled with `text-primary-soft-foreground` (#115e59) or low-contrast muted gray instead of crisp, neutral semantic typography.
   - Step numbers ("01", "02", "03") were set to `text-primary/30`, resulting in a ~1.8:1 contrast ratio against white surfaces (severely failing WCAG 2.2 AA).
   - Important metadata and timestamps were washed out.

5. **Direct HTML-Based Feature UI (Violation of Section 4):**
   - Feature pages frequently implemented raw `<button>`, `<select>`, `<input>`, and `<form>` tags with lengthy bespoke Tailwind class strings instead of using shadcn/ui primitives (`Button`, `Select`, `Input`, `FormField`).
   - Links wrapping raw buttons (`<Link><button>...</button></Link>`) caused nested interactive elements and hydration/accessibility issues.
   - Form inputs wrapped in bespoke divs bypassed proper label association (`htmlFor` vs cloned `id`).

6. **Misaligned Thematic Imagery:**
   - The authentication shell featured a sci-fi / futuristic space station image (`/images/auth-showcase.jpg`) titled "Nebula Exchange" with glassmorphism glow overlays—wholly incongruous with an education and tutoring platform in Bangladesh.
   - Persistent PWA prompt floating at the bottom right collided with dashboard navigation and mobile navigation.

---

## 2. Categorized Defect Inventory

| ID         | Category               | Defect Description                                                                                        | Affected Files / Routes                                                 | Severity |
| :--------- | :--------------------- | :-------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :------- |
| **DEF-01** | Color Hierarchy        | `border-primary/40` used indiscriminately on 56+ components                                               | Homepage, Pricing, Safety, FAQ, Student/Tutor/Guardian/Admin Dashboards | High     |
| **DEF-02** | Color Hierarchy        | `StatusBadge` & `Badge` `success` variant mapped to `primary` instead of semantic green                   | `components/ui/Badge.tsx`, `components/shared/StatusBadge.tsx`          | High     |
| **DEF-03** | Color Hierarchy        | Multi-color clashing in Admin cards (`from-brand to-primary/10 border-info/40 text-info-soft-foreground`) | `features/admin/pages/admin-overview-page.tsx`                          | Medium   |
| **DEF-04** | Elevation/Borders      | Nested cards inside cards (e.g., Academic Profile 4-box grid inside Card)                                 | `StudentAcademicProfileCard.tsx`, `HeroStudentTablet.tsx`               | High     |
| **DEF-05** | Elevation/Borders      | Inconsistent StatCard styling (1 dark teal gradient card vs 3 white bordered cards)                       | `HeroKpiCard.tsx`, Student/Tutor/Guardian Dashboards                    | High     |
| **DEF-06** | Elevation/Borders      | Unnecessary container cards wrapping action button bars                                                   | `student-dashboard-page.tsx`, `tutor-dashboard-page.tsx`                | Medium   |
| **DEF-07** | Typography/Contrast    | Step numbers (01, 02, 03) rendered in `text-primary/30` failing WCAG contrast                             | `home-page.tsx`, `how-it-works-page.tsx`                                | High     |
| **DEF-08** | Typography/Contrast    | Dashboard page subtitles styled with `text-primary-soft-foreground` instead of neutral ink                | `DashboardShell.tsx`, all role dashboards                               | Medium   |
| **DEF-09** | Typography/Contrast    | Input placeholder text in gray washes hard to read                                                        | `Input.tsx`, `HeroSearchBar.tsx`, auth forms                            | Medium   |
| **DEF-10** | Component Architecture | Direct HTML `<button>`, `<select>`, `<input>` in feature pages                                            | `HeroSearchBar.tsx`, `home-page.tsx`, `student-dashboard-page.tsx`      | High     |
| **DEF-11** | Component Architecture | Nested `<Link><button>` interactive elements                                                              | `home-page.tsx` CTA, student/tutor header actions                       | High     |
| **DEF-12** | Component Architecture | `FormField` cloning `id` onto wrapper `div` of `Input.tsx` breaking label association                     | `components/ui/Input.tsx`, `components/shared/FormField.tsx`            | High     |
| **DEF-13** | Visual Consistency     | Inconsistent border-radius scale (`rounded-3xl` vs `rounded-2xl` vs `rounded-full`)                       | Dashboard cards, inputs, buttons, sidebars                              | Medium   |
| **DEF-14** | Brand & Imagery        | Sci-Fi space-station theme image on Auth shell (`auth-showcase.jpg`)                                      | `components/auth/authShell.tsx`                                         | High     |
| **DEF-15** | Layout & Chrome        | Sidebar promo card taking excessive vertical real estate                                                  | `features/dashboard/components/DashboardSidebar.tsx`                    | Medium   |
| **DEF-16** | Layout & Chrome        | Floating PWA install prompt colliding with bottom content & drawer                                        | `components/pwa/PWARegister.tsx`                                        | Low      |

---

## 3. Action Plan & Quality Standard

1. **Tokens & Theme Standardization:**
   - Refine `globals.css` light tokens: soft, warm neutral canvas (`#f8fafc`), crisp white card surfaces (`#ffffff`), restrained subtle border (`#e2e8f0`), deep ink typography (`#0f172a`), refined elevation scale with zero heavy drop shadows.
   - Enforce exact Ocean Teal (`#0df5c4`, `#00e1b2`) and Sapphire Blue (`#2563eb`, `#3b82f6`) brand values with proper semantic roles.

2. **Primitive Component Modernization (shadcn/ui):**
   - Refactor `Button`, `Card`, `Badge`, `Input`, `Select`, `Dialog`, `Table`, `Tabs`, `Separator`, `Skeleton`.
   - Remove hard-coded `border-primary/40` from all base components.
   - Introduce clean variants: `default`, `outline`, `ghost`, `secondary`, `subtle`.

3. **Shared Architecture & Form System:**
   - Unify `FormField`, `PageHeader`, `PageContainer`, `StatCard`, `StatusBadge`, `DataTable`, `EmptyState`.
   - Ensure 100% accessible label-to-input association without wrapper interference.

4. **Layout Shells & Navigation:**
   - Refactor `Navbar`, `Footer`, `DashboardSidebar`, `DashboardTopbar`, `DashboardMobileNav`, and `BottomNavbar`.
   - Remove redundant borders, inner shadows, and oversized promo cards.

5. **Role & Feature Page Refactoring:**
   - Refactor Public, Auth, Student, Tutor, Guardian, Admin, Bookings, Payments, Classroom, and Settings pages.
