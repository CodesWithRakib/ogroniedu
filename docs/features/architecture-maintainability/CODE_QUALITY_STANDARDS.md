# Code Quality & Architectural Standards — OgroniEdu (অগ্রণী এডু)

## 1. Overview & Purpose

This standard outlines non-negotiable coding conventions, architectural invariants, and verification expectations for engineering work across OgroniEdu.

---

## 2. Core Architectural Standards

### 2.1 Dependency Direction & Layering

- **Strict Layering**: HTTP Controllers and WebSocket Gateways must only call Application Services. They must never directly execute raw SQL queries or mutate database state.
- **Dependency Inversion**: Application services must depend on abstractions (interfaces / tokens) rather than concrete presentation transports (e.g. WebSocket gateways).
- **Zero Circular Dependencies**: Modules, custom hooks, components, and services must never import each other bidirectionally.

### 2.2 Domain Business Rules & Pure Calculations

- **Pure Functions**: Calculations involving money (poisha / BDT), commission splits, discount codes, eligibility criteria, and candidate scoring must reside in pure utility functions.
- **Integer Financial Arithmetic**: Never use floating-point math for money. All calculations must use integer `poisha` (1 BDT = 100 poisha). BigInt or integer arithmetic is mandatory.
- **Double-Entry Balancing**: Any ledger transaction must produce balanced debits and credits: `SUM(debits) === SUM(credits)`.

### 2.3 Strict TypeScript & Type Safety

- **No `any`**: The use of `any` is strictly prohibited in production source code. Use typed generics, `unknown` with type narrowing, or specific discriminated unions.
- **No Blanket Suppressions**: Blanket `// @ts-ignore` or broad `eslint-disable` comments are prohibited. If an isolated third-party library typing issue requires a suppression, scope it to a single line with `// @ts-expect-error: <exact rationale>`.
- **Contracts Single Source of Truth**: All shared DTOs, API envelopes, and event payloads must reside in `@ogroniedu/contracts`.

### 2.4 Error Handling & HTTP Envelopes

- **Canonical Envelope**: Every successful API response must return the canonical envelope:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "requestId": "uuid",
      "timestamp": "ISO-8601",
      "path": "/api/v1/..."
    }
  }
  ```
- **Error Envelopes**: Errors must return `HttpException` subclasses (`BadRequestException`, `NotFoundException`, `ForbiddenException`) that serialize into:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable description"
    },
    "meta": { "requestId": "...", "timestamp": "..." }
  }
  ```
- **Zero Stack Trace Leaks**: Internal database errors and stack traces must never be sent to the client.

### 2.5 Component Composition & Frontend Quality

- **File Length Guideline**: Component files should generally remain under 400 lines. Monolithic files exceeding 800 lines should be evaluated for decomposition into cohesive sub-components.
- **Separation of Presentation & Data**: Large JSX tables, forms, and dialogs must be extracted into dedicated components rather than inlined in page orchestrators.
- **Established Design System**: Always utilize the project's customized shadcn / Tailwind UI component primitives (`Button`, `Dialog`, `Card`, `Badge`, `Input`) rather than unstyled HTML tags.

---

## 3. Automated Verification Gates

Every pull request or commit must pass:

1. `pnpm typecheck` (0 errors across 5 workspace packages).
2. `pnpm lint` (0 errors, 0 warnings across all files).
3. `pnpm test` (100% pass rate; no skipped tests or assertions).
4. `node scripts/validate-documentation.js` (All canonical documents intact).
5. `node scripts/smoke-test.mjs --target local` (8/8 smoke checks pass).
