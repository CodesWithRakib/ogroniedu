import { describe, it, expect } from 'vitest';
import {
  makeStore,
  setCredentials,
  logout,
  setPreferredLocale,
  toggleNotificationCenter,
  setNotificationCenterOpen,
  setActiveLocale,
  enqueueToast,
  removeToast,
  notificationsApi,
} from '../src/store';

describe('Centralized Redux Store & Slices Unit Tests', () => {
  it('should initialize store with root reducers and default states', () => {
    const store = makeStore();
    const state = store.getState();

    expect(state.auth).toBeDefined();
    expect(state.ui).toBeDefined();
    expect(state.api).toBeDefined();

    // Phase 21: no mock session — boot is logged out until real login.
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.user).toBeNull();
    expect(state.auth.token).toBeNull();
    expect(state.ui.isNotificationCenterOpen).toBe(false);
    expect(state.ui.activeLocale).toBe('bn');
  });

  describe('Auth Slice Reducers', () => {
    it('should handle setCredentials correctly', () => {
      const store = makeStore();
      const newUser = {
        id: '22222222-2222-4222-b222-222222222222',
        displayName: 'রাশেদ করিম (Rashed Karim)',
        email: 'tutor@ogroniedu.com',
        phone: null,
        roles: ['tutor'] as Array<'tutor'>,
        preferredLocale: 'bn' as const,
      };

      store.dispatch(
        setCredentials({
          user: newUser,
          token: 'jwt-token-xyz',
        }),
      );

      const state = store.getState().auth;
      expect(state.user?.id).toBe(newUser.id);
      expect(state.user?.roles).toContain('tutor');
      expect(state.token).toBe('jwt-token-xyz');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle logout correctly', () => {
      const store = makeStore();
      store.dispatch(logout());

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle setPreferredLocale correctly', () => {
      const store = makeStore();
      store.dispatch(
        setCredentials({
          user: {
            id: 'u-1',
            displayName: 'Test User',
            email: null,
            phone: null,
            roles: ['student'],
            preferredLocale: 'bn',
          },
          token: 't',
        }),
      );
      store.dispatch(setPreferredLocale('en'));

      const state = store.getState().auth;
      expect(state.user?.preferredLocale).toBe('en');
    });
  });

  describe('UI Slice Reducers', () => {
    it('should toggle and set notification center visibility', () => {
      const store = makeStore();
      expect(store.getState().ui.isNotificationCenterOpen).toBe(false);

      store.dispatch(toggleNotificationCenter());
      expect(store.getState().ui.isNotificationCenterOpen).toBe(true);

      store.dispatch(setNotificationCenterOpen(false));
      expect(store.getState().ui.isNotificationCenterOpen).toBe(false);
    });

    it('should handle active locale switching', () => {
      const store = makeStore();
      expect(store.getState().ui.activeLocale).toBe('bn');

      store.dispatch(setActiveLocale('en'));
      expect(store.getState().ui.activeLocale).toBe('en');
    });

    it('should manage toast queue with enqueue and remove', () => {
      const store = makeStore();
      expect(store.getState().ui.toasts.length).toBe(0);

      store.dispatch(
        enqueueToast({
          title: 'সফল বুকিং',
          message: 'আপনার বুকিং অনুরোধ সফলভাবে পাঠানো হয়েছে।',
          type: 'success',
        }),
      );

      let toasts = store.getState().ui.toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].title).toBe('সফল বুকিং');
      expect(toasts[0].id).toBeDefined();

      const toastId = toasts[0].id;
      store.dispatch(removeToast(toastId));

      toasts = store.getState().ui.toasts;
      expect(toasts.length).toBe(0);
    });
  });

  describe('RTK Query API Endpoint Definitions', () => {
    it('should define all notification query and mutation endpoints', () => {
      expect(notificationsApi.endpoints.getNotifications).toBeDefined();
      expect(notificationsApi.endpoints.getUnreadCount).toBeDefined();
      expect(notificationsApi.endpoints.markAsRead).toBeDefined();
      expect(notificationsApi.endpoints.markAllAsRead).toBeDefined();
      expect(notificationsApi.endpoints.dispatchNotification).toBeDefined();
    });

    it('should define real domain endpoints (no mock-only store)', async () => {
      const { authApi } = await import('../src/store/services/auth-api');
      const { tutorsApi } = await import('../src/store/services/tutors-api');
      const { bookingsApi } = await import('../src/store/services/bookings-api');
      const { sessionsApi } = await import('../src/store/services/sessions-api');
      const { learningApi } = await import('../src/store/services/learning-api');
      const { paymentsApi } = await import('../src/store/services/payments-api');
      const { guardiansApi } = await import('../src/store/services/guardians-api');
      const { adminApi } = await import('../src/store/services/admin-api');
      expect(authApi.endpoints.login).toBeDefined();
      expect(authApi.endpoints.register).toBeDefined();
      expect(authApi.endpoints.getSessionUser).toBeDefined();
      expect(tutorsApi.endpoints.searchTutors).toBeDefined();
      expect(bookingsApi.endpoints.createBookingRequest).toBeDefined();
      expect(sessionsApi.endpoints.getSessions).toBeDefined();
      expect(learningApi.endpoints.submitAssignment).toBeDefined();
      expect(paymentsApi.endpoints.createPaymentOrder).toBeDefined();
      expect(guardiansApi.endpoints.getLinkedChildren).toBeDefined();
      expect(adminApi.endpoints.getAdminDashboard).toBeDefined();
    });
  });
});
