import { baseApi, type ApiSuccessEnvelope } from '../base-api';

export type SupportTicketCategory =
  | 'general'
  | 'tutorHelp'
  | 'tutorVerification'
  | 'paymentSupport'
  | 'safetyIncident';

export interface SubmitSupportTicketBody {
  name: string;
  email: string;
  phone?: string;
  category?: SupportTicketCategory;
  message: string;
}

export interface SubmittedTicket {
  id: string;
  status: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  name: string;
  email: string;
  phoneE164: string | null;
  category: string;
  message: string;
  status: string;
  reporterUserId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitSupportTicket: builder.mutation<
      ApiSuccessEnvelope<SubmittedTicket>,
      SubmitSupportTicketBody
    >({
      query: (body) => ({ url: '/api/v1/support/tickets', method: 'POST', body }),
      invalidatesTags: [{ type: 'SupportTicket', id: 'LIST' }],
    }),
    listMySupportTickets: builder.query<ApiSuccessEnvelope<SupportTicketItem[]>, void>({
      query: () => '/api/v1/support/tickets/mine',
      providesTags: [{ type: 'SupportTicket', id: 'MINE' }],
    }),
  }),
  overrideExisting: false,
});

export const { useSubmitSupportTicketMutation, useListMySupportTicketsQuery } = supportApi;
