import { baseApi } from '../base-api';
import type {
  NotificationsListResponseDto,
  UnreadCountResponseDto,
  MarkAsReadResponseDto,
  MarkAllAsReadResponseDto,
  DispatchNotificationDto,
  NotificationItemDto,
  GetNotificationsQueryDto,
} from '@ogroniedu/contracts';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsListResponseDto, GetNotificationsQueryDto | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.unreadOnly !== undefined) {
          queryParams.append('unreadOnly', String(params.unreadOnly));
        }
        if (params?.limit) {
          queryParams.append('limit', String(params.limit));
        }
        if (params?.page) {
          queryParams.append('page', String(params.page));
        }
        if (params?.locale) {
          queryParams.append('locale', params.locale);
        }

        const queryString = queryParams.toString();
        return `/api/v1/notifications${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: 'Notification' as const,
                id,
              })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    getUnreadCount: builder.query<UnreadCountResponseDto, void>({
      query: () => '/api/v1/notifications/unread-count',
      providesTags: [{ type: 'UnreadCount', id: 'COUNT' }],
    }),

    markAsRead: builder.mutation<MarkAsReadResponseDto, { id: string }>({
      query: ({ id }) => ({
        url: `/api/v1/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Notification', id },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),

    markAllAsRead: builder.mutation<MarkAllAsReadResponseDto, void>({
      query: () => ({
        url: '/api/v1/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),

    dispatchNotification: builder.mutation<NotificationItemDto, DispatchNotificationDto>({
      query: (body) => ({
        url: '/api/v1/notifications/test-dispatch',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'UnreadCount', id: 'COUNT' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDispatchNotificationMutation,
} = notificationsApi;
