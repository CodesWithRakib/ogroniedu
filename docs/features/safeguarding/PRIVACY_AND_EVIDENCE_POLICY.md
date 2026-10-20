# Privacy and Evidence Protection Policy

**Document Identifier:** `SEC-SAFEGUARDING-EVIDENCE-001`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Evidence Storage & Isolation

1. **Private Bucket Storage:**
   - Evidence files attached to safeguarding reports (screenshots, audio clips, chat transcripts, documents) are stored in private storage (`file_assets`).
   - They are never placed in public buckets or accessible via unauthenticated CDN links.
2. **Access-Controlled Download Endpoints:**
   - Evidence is retrieved exclusively through `/api/v1/trust/safety-reports/:id/evidence/:assetId`.
   - The endpoint verifies:
     a) Case existence.
     b) Caller authorization (is assigned investigator, compliance reviewer, admin, or the original uploader).
     c) Accused party check: strictly rejects the reported user with HTTP 403 Forbidden.
     d) Attachment membership: verifies `assetId` is registered in `report.evidenceAssetIds` or associated case messages.

---

## 2. Evidence Upload Validation

1. **Permitted File Formats:**
   - Images: `image/jpeg`, `image/png`, `image/webp`.
   - Documents: `application/pdf`.
   - Audio: `audio/mpeg`, `audio/mp4`, `audio/wav`.
2. **Size Restrictions:**
   - Maximum 15 MB per evidence file.
3. **MIME Verification:**
   - Server-side verification of magic numbers and file extensions. Client-supplied headers alone are never trusted.

---

## 3. Auditing & Immutable Access Logs

1. Every retrieval of case evidence creates a `safety_case_events` record:
   - `event_type`: `'evidence_accessed'`
   - `actor_id`: User ID of downloader
   - `metadata`: `{ assetId, timestamp, ipAddress }`
2. Evidence cannot be deleted or replaced once a case enters `under_review`, preserving legal chain-of-custody.
