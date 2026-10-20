import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  ALLOWED_EXTENSIONS_BY_MIME,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from '../../files/constants/file-validation.constants';

/**
 * Learning material uploads reuse the platform's existing validation tables —
 * the allowed document/image formats are identical to tutor evidence, and the
 * size cap stays 10 MB. Keeping one source of truth prevents drift.
 */
export const MAX_LEARNING_FILE_SIZE_BYTES = MAX_EVIDENCE_FILE_SIZE_BYTES;
export const ALLOWED_LEARNING_MIME_TYPES = ALLOWED_EVIDENCE_MIME_TYPES;
export const ALLOWED_LEARNING_EXTENSIONS_BY_MIME = ALLOWED_EXTENSIONS_BY_MIME;

/** Private storage root. Never inside a public web root. */
export const LEARNING_UPLOAD_DIR_ENV = 'LEARNING_UPLOAD_DIR';
export const DEFAULT_LEARNING_UPLOAD_DIR = 'var/uploads/learning';
export const LEARNING_STORAGE_PROVIDER = 'local_secure';
