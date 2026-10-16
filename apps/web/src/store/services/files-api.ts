import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type EvidencePurpose = 'nid' | 'academic_certificate' | 'degree' | 'other_evidence';

export interface UploadEvidenceRequest {
  purpose: EvidencePurpose;
  originalFilename: string;
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  contentBase64?: string;
}

export interface EvidenceFile {
  id: string;
  storageKey: string;
  originalFilename: string;
  mediaType: string;
  sizeBytes: number;
  purpose: string;
  visibility: string;
  createdAt: string;
}

export interface FileAccessRecord {
  id: string;
  originalFilename: string;
  mediaType: string;
  sizeBytes: number;
  purpose: string;
  visibility: string;
  storageProvider?: string;
  accessGranted: boolean;
  signedAccessUrl?: string;
  signedAccessToken?: string;
  expiresAt?: string;
}

export const filesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadEvidence: builder.mutation<
      { success: boolean; file: EvidenceFile },
      UploadEvidenceRequest
    >({
      query: (body) => ({ url: '/api/v1/files/upload-evidence', method: 'POST', body }),
      invalidatesTags: [{ type: 'FileAsset', id: 'LIST' }],
    }),
    getFileAccess: builder.query<{ success: boolean; file: FileAccessRecord }, string>({
      query: (fileId) => `/api/v1/files/${fileId}/access`,
      providesTags: (_r, _e, fileId) => [{ type: 'FileAsset', id: fileId }],
    }),
  }),
  overrideExisting: false,
});

export const { useUploadEvidenceMutation, useGetFileAccessQuery, useLazyGetFileAccessQuery } = filesApi;
