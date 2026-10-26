# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness

## SEO & Metadata Policy

This document defines search engine optimization policies, structured data schemas, crawl rules, and bilingual canonicalization standards for OgroniEdu.

---

## 1. Canonical Domain & URL Strategy

- **Canonical Base URL:** Configured via `process.env.NEXT_PUBLIC_APP_URL`, defaulting to `https://ogroni.edu.bd`.
- **Language Alternates:** Every public page MUST declare `hreflang` alternates:
  - `bn`: `https://ogroni.edu.bd/bn/...`
  - `en`: `https://ogroni.edu.bd/en/...`
  - `x-default`: `https://ogroni.edu.bd/bn/...` (Bangla is canonical default for Bangladesh audience)

---

## 2. Robots Policy (`robots.txt`)

### Directives

- **Allow:** Public landing pages, tutor discovery, verified tutor profiles, informational and legal pages:
  - `/`
  - `/*/tutors`
  - `/*/tutors/*`
  - `/*/how-it-works`
  - `/*/pricing`
  - `/*/safety`
  - `/*/faq`
  - `/*/contact`
  - `/*/terms`
  - `/*/privacy`
- **Disallow:** All authenticated, administrative, financial, and private areas:
  - `/*/dashboard`
  - `/*/dashboard/*`
  - `/*/admin`
  - `/*/admin/*`
  - `/*/analytics`
  - `/*/payments`
  - `/*/payments/*`
  - `/*/learning`
  - `/*/sessions`
  - `/*/sessions/*`
  - `/*/messages`
  - `/*/notifications`
  - `/*/safety-reports`
  - `/*/assignments/*`
  - `/*/classroom/*`
  - `/*/onboarding`
  - `/api/*`
- **Sitemap Reference:** `https://ogroni.edu.bd/sitemap.xml`

---

## 3. Dynamic Sitemap Specification (`sitemap.xml`)

The sitemap is dynamically generated:

1. **Core Static Routes:** Home, Tutors Catalog, How It Works, Pricing, Safety, FAQ, Contact, Terms, Privacy across both `bn` and `en`.
2. **Dynamic Public Tutor Profiles:**
   - Queries approved, published, non-held tutors directly from the database.
   - Generates entries:
     - `https://ogroni.edu.bd/bn/tutors/[id]`
     - `https://ogroni.edu.bd/en/tutors/[id]`
   - Includes actual `lastModified` timestamp from `updated_at`.
   - Priority: `0.8`, Change Frequency: `daily`.

---

## 4. Structured Data (JSON-LD) Schemas

### 1. `schema.org/WebSite` (Home Page)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "OgroniEdu",
  "url": "https://ogroni.edu.bd",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://ogroni.edu.bd/en/tutors?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 2. `schema.org/Organization` (Platform Brand)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "OgroniEdu (অগ্রণী এডু)",
  "url": "https://ogroni.edu.bd",
  "logo": "https://ogroni.edu.bd/images/ogroni-logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+8801700000000",
    "contactType": "customer service",
    "areaServed": "BD",
    "availableLanguage": ["bn", "en"]
  }
}
```

### 3. `schema.org/Person` (Tutor Public Profile)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Dr. Tanvir Ahmed",
  "jobTitle": "Physics & Math Academic Tutor",
  "worksFor": {
    "@type": "Organization",
    "name": "OgroniEdu"
  },
  "description": "5+ years experienced tutor for BUET and DU preparation.",
  "image": "https://ogroni.edu.bd/tutors/avatar.jpg"
}
```

_Privacy Guard:_ No personal phone numbers, emails, NID document numbers, or home addresses are ever emitted in structured data.
