# Chat Attachments & File Policy

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Modules:** Files Service, Real-Time Messaging

---

## 1. Permitted Attachment Types

To facilitate effective tuition without compromising system security or user safety:

- **Documents:** PDF (`application/pdf`) up to 10 MB.
- **Images:** JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`) up to 5 MB.
- **Prohibited:** Executables (`.exe`, `.bat`, `.cmd`, `.sh`), script files (`.js`, `.vbs`, `.py`), compressed archives (`.zip`, `.rar`, `.7z`), and macro-enabled documents.

---

## 2. Security & Upload Pipeline

1. **Pre-Upload Authorization:**
   - The user requests an upload ticket via `/api/v1/files/upload-ticket`.
   - The file service validates user authentication, quota, and extension whitelist.
2. **Post-Upload Verification:**
   - Files are stored with UUID-keyed asset identifiers.
   - Message records reference attachment asset IDs (`attachment_asset_ids UUID[]`).
3. **Short-Lived Signed Delivery:**
   - Attachment URLs are never permanent or public.
   - Participants request temporary signed URLs to download or preview attachments.
