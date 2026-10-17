import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export interface TaxonomySubject extends Record<string, unknown> {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  category?: string;
  isActive: boolean;
}

export interface TaxonomyEducationLevel extends Record<string, unknown> {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TaxonomyCurriculum extends Record<string, unknown> {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  boardName?: string | null;
  isActive: boolean;
}

export interface TaxonomyStream extends Record<string, unknown> {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface TaxonomyInstitution extends Record<string, unknown> {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  type: 'school' | 'college' | 'school_and_college' | 'university' | 'madrasah';
  district?: string | null;
  division?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface TaxonomyLocation extends Record<string, unknown> {
  code: string;
  nameEn: string;
  nameBn: string;
  division: string;
}

export const taxonomyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<ApiSuccessEnvelope<TaxonomySubject[]>, void>({
      query: () => '/api/v1/taxonomy/subjects',
      providesTags: [{ type: 'Taxonomy', id: 'SUBJECTS' }],
    }),
    getEducationLevels: builder.query<ApiSuccessEnvelope<TaxonomyEducationLevel[]>, void>({
      query: () => '/api/v1/taxonomy/education-levels',
      providesTags: [{ type: 'Taxonomy', id: 'LEVELS' }],
    }),
    getCurricula: builder.query<ApiSuccessEnvelope<TaxonomyCurriculum[]>, void>({
      query: () => '/api/v1/taxonomy/curricula',
      providesTags: [{ type: 'Taxonomy', id: 'CURRICULA' }],
    }),
    getStreams: builder.query<ApiSuccessEnvelope<TaxonomyStream[]>, void>({
      query: () => '/api/v1/taxonomy/streams',
      providesTags: [{ type: 'Taxonomy', id: 'STREAMS' }],
    }),
    getInstitutions: builder.query<
      ApiSuccessEnvelope<TaxonomyInstitution[]>,
      { search?: string; type?: string; district?: string } | void
    >({
      query: (params) => ({
        url: '/api/v1/taxonomy/institutions',
        params: params ? { ...params } : undefined,
      }),
      providesTags: [{ type: 'Taxonomy', id: 'INSTITUTIONS' }],
    }),
    getLocations: builder.query<ApiSuccessEnvelope<TaxonomyLocation[]>, void>({
      query: () => '/api/v1/taxonomy/locations',
      providesTags: [{ type: 'Taxonomy', id: 'LOCATIONS' }],
    }),

    // Admin CRUD Operations
    createEducationLevel: builder.mutation<
      ApiSuccessEnvelope<TaxonomyEducationLevel>,
      { code: string; nameEn: string; nameBn: string; sortOrder?: number; isActive?: boolean }
    >({
      query: (body) => ({ url: '/api/v1/taxonomy/education-levels', method: 'POST', body }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'LEVELS' }],
    }),
    updateEducationLevel: builder.mutation<
      ApiSuccessEnvelope<TaxonomyEducationLevel>,
      { id: string; nameEn?: string; nameBn?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/taxonomy/education-levels/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'LEVELS' }],
    }),
    deleteEducationLevel: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/v1/taxonomy/education-levels/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'LEVELS' }],
    }),

    createCurriculum: builder.mutation<
      ApiSuccessEnvelope<TaxonomyCurriculum>,
      { code: string; nameEn: string; nameBn: string; boardName?: string; isActive?: boolean }
    >({
      query: (body) => ({ url: '/api/v1/taxonomy/curricula', method: 'POST', body }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'CURRICULA' }],
    }),
    updateCurriculum: builder.mutation<
      ApiSuccessEnvelope<TaxonomyCurriculum>,
      { id: string; nameEn?: string; nameBn?: string; boardName?: string; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/taxonomy/curricula/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'CURRICULA' }],
    }),
    deleteCurriculum: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/v1/taxonomy/curricula/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'CURRICULA' }],
    }),

    createStream: builder.mutation<
      ApiSuccessEnvelope<TaxonomyStream>,
      { code: string; nameEn: string; nameBn: string; description?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: (body) => ({ url: '/api/v1/taxonomy/streams', method: 'POST', body }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'STREAMS' }],
    }),
    updateStream: builder.mutation<
      ApiSuccessEnvelope<TaxonomyStream>,
      { id: string; nameEn?: string; nameBn?: string; description?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/taxonomy/streams/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'STREAMS' }],
    }),
    deleteStream: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/v1/taxonomy/streams/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'STREAMS' }],
    }),

    createInstitution: builder.mutation<
      ApiSuccessEnvelope<TaxonomyInstitution>,
      {
        code: string;
        nameEn: string;
        nameBn: string;
        type?: 'school' | 'college' | 'school_and_college' | 'university' | 'madrasah';
        district?: string;
        division?: string;
        sortOrder?: number;
        isActive?: boolean;
      }
    >({
      query: (body) => ({ url: '/api/v1/taxonomy/institutions', method: 'POST', body }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'INSTITUTIONS' }],
    }),
    updateInstitution: builder.mutation<
      ApiSuccessEnvelope<TaxonomyInstitution>,
      {
        id: string;
        nameEn?: string;
        nameBn?: string;
        type?: 'school' | 'college' | 'school_and_college' | 'university' | 'madrasah';
        district?: string;
        division?: string;
        sortOrder?: number;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/taxonomy/institutions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'INSTITUTIONS' }],
    }),
    deleteInstitution: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/v1/taxonomy/institutions/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'INSTITUTIONS' }],
    }),

    createSubject: builder.mutation<
      ApiSuccessEnvelope<TaxonomySubject>,
      { code: string; nameEn: string; nameBn: string; category?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: (body) => ({ url: '/api/v1/taxonomy/subjects', method: 'POST', body }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'SUBJECTS' }],
    }),
    updateSubject: builder.mutation<
      ApiSuccessEnvelope<TaxonomySubject>,
      { id: string; nameEn?: string; nameBn?: string; category?: string; sortOrder?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/taxonomy/subjects/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'SUBJECTS' }],
    }),
    deleteSubject: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/api/v1/taxonomy/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Taxonomy', id: 'SUBJECTS' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubjectsQuery,
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
  useGetStreamsQuery,
  useGetInstitutionsQuery,
  useGetLocationsQuery,
  useCreateEducationLevelMutation,
  useUpdateEducationLevelMutation,
  useDeleteEducationLevelMutation,
  useCreateCurriculumMutation,
  useUpdateCurriculumMutation,
  useDeleteCurriculumMutation,
  useCreateStreamMutation,
  useUpdateStreamMutation,
  useDeleteStreamMutation,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
  useDeleteInstitutionMutation,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} = taxonomyApi;
