import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export const taxonomyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<ApiSuccessEnvelope<Array<Record<string, unknown>>>, void>({
      query: () => '/api/v1/taxonomy/subjects',
      providesTags: [{ type: 'Taxonomy', id: 'SUBJECTS' }],
    }),
    getEducationLevels: builder.query<ApiSuccessEnvelope<Array<Record<string, unknown>>>, void>({
      query: () => '/api/v1/taxonomy/education-levels',
      providesTags: [{ type: 'Taxonomy', id: 'LEVELS' }],
    }),
    getCurricula: builder.query<ApiSuccessEnvelope<Array<Record<string, unknown>>>, void>({
      query: () => '/api/v1/taxonomy/curricula',
      providesTags: [{ type: 'Taxonomy', id: 'CURRICULA' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubjectsQuery,
  useGetEducationLevelsQuery,
  useGetCurriculaQuery,
} = taxonomyApi;
