/**
 * File-upload validation boundaries (size, MIME, extension).
 * Single source of truth — FilesService and DTO validators must import from here.
 */
export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_EVIDENCE_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
