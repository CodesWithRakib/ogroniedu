/**
 * Shared client-side helpers for private evidence uploads.
 * Server-side limits (`MAX_EVIDENCE_FILE_SIZE_BYTES`, MIME allow-list) are
 * enforced by the API; these checks only give fast feedback in the browser.
 */
export const ACCEPTED_EVIDENCE_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export type AcceptedEvidenceMime = (typeof ACCEPTED_EVIDENCE_MIME)[number];

export function evidenceMimeOf(file: File): AcceptedEvidenceMime | null {
  return (ACCEPTED_EVIDENCE_MIME as readonly string[]).includes(file.type)
    ? (file.type as AcceptedEvidenceMime)
    : null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? (result.split(',').pop() ?? '') : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
