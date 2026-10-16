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
    getLocations: builder.query<ApiSuccessEnvelope<TaxonomyLocation[]>, void>({
      query: () => '/api/v1/taxonomy/locations',
      providesTags: [{ type: 'Taxonomy', id: 'LOCATIONS' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubjectsQuery,
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
  useGetLocationsQuery,
} = taxonomyApi;
