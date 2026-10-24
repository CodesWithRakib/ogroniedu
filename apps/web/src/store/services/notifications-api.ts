import { baseApi } from '../base-api';
import { toQueryString } from '@/lib/api/query';
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
      query: (params) =>
        `/api/v1/notifications${toQueryString({
          unreadOnly: params?.unreadOnly,
          limit: params?.limit,
          page: params?.page,
          cursor: params?.cursor,
          pageSize: params?.pageSize,
          locale: params?.locale,
        })}`,
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

    getPreferences: builder.query<
      Array<{ category: string; channel: string; isEnabled: boolean }>,
      void
    >({
      query: () => '/api/v1/notifications/preferences',
      providesTags: [{ type: 'Notification' as const, id: 'PREFERENCES' }],
    }),

    updatePreferences: builder.mutation<
      Array<{ category: string; channel: string; isEnabled: boolean }>,
      { preferences: Array<{ category: string; channel: string; isEnabled: boolean }> }
    >({
      query: (body) => ({
        url: '/api/v1/notifications/preferences',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'Notification' as const, id: 'PREFERENCES' }],
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
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} = notificationsApi;
