# OgroniEdu — Localization (i18n) & Accessibility (a11y) Standards

**Languages:** Bengali (`bn` — Default) & English (`en`)  
**Accessibility Target:** WCAG 2.1 Level AA Compliance  
**Status:** Approved Standard

---

## 1. Localization Strategy & Typography

### 1.1 Language Architecture with `next-intl`

- Next.js App Router utilizes `next-intl` for routing and type-safe translations:
  - Route pattern: `/[locale]/dashboard/...` (e.g. `/bn/dashboard`, `/en/dashboard`).
  - Fallback locale: `bn` (Bengali).
  - Persistence: User's `preferred_locale` stored in database profile and synced with `NEXT_LOCALE` cookie.

### 1.2 Typography System

- **Bengali Primary Font:** `Hind Siliguri` (Google Fonts) with fallback to `Noto Sans Bengali`, `sans-serif`. Designed for legibility in Bengali diacritics (কার, ফলা, যুক্তবর্ণ).
- **English & Code Font:** `Inter` for Latin scripts; `JetBrains Mono` for monospace codes.
- **Font Display:** `font-display: swap` to prevent FOIT (Flash of Invisible Text).

### 1.3 Currency, Date & Number Localization

- **Currency:** Displayed as `৳ ১,৫০০` (Bengali) and `BDT 1,500` (English).
- **Numeral Formatting:**
  - In Bengali mode: Numerals translated to Bengali digits using `Intl.NumberFormat('bn-BD')`.
  - In English mode: Standard Arabic numerals `Intl.NumberFormat('en-BD')`.
- **Timezone:** Always rendered in Bangladesh Standard Time (`Asia/Dhaka`, UTC+6).

---

## 2. Web Accessibility (WCAG 2.1 Level AA)

1. **Color Contrast:**
   - All body text exhibits a contrast ratio of at least **4.5:1** against backgrounds.
   - Large headings (>= 18pt or 14pt bold) exhibit a contrast ratio of at least **3.0:1**.
   - Primary Brand Color: Deep Forest Teal (`#0D5C46`) and Warm Amber (`#D97706`) tailored for high contrast on light and dark backgrounds.
2. **Keyboard Navigation & Focus Traps:**
   - All interactive elements (buttons, inputs, dropdowns, modal dialogs) are operable via `Tab`, `Shift+Tab`, `Enter`, and `Escape`.
   - Distinct focus rings (`ring-2 ring-primary ring-offset-2`) displayed on keyboard focus.
3. **Screen Readers & ARIA Semantics:**
   - All icon-only buttons (such as the Notification Bell or Search Trigger) include explicit `aria-label` attributes localized into the active language (e.g. `aria-label="বিজ্ঞপ্তি (৩টি অপঠিত)"`).
   - Dynamic real-time toasts utilize `role="status"` and `aria-live="polite"` so screen readers announce notifications without interrupting user workflows.
4. **Reduced Motion Preferences:**
   - Animations respect `prefers-reduced-motion: reduce` by disabling transitions and slide-in effects for sensitive users.
