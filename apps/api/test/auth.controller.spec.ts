import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthController Endpoint Integration Tests', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      revokeAllSessions: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      resetPassword: vi.fn(),
      getProfile: vi.fn(),
    };

    controller = new AuthController(mockAuthService as AuthService);
  });

  it('POST /register should call authService.register and set cookie', async () => {
    const mockRes = { cookie: vi.fn() } as any;
    const mockReq = { headers: {}, socket: {} } as any;

    (mockAuthService.register as any).mockResolvedValueOnce({
      user: { id: 'u1', displayName: 'Student Test', email: 's@test.com', roles: ['student'] },
      accessToken: 'acc-token',
      refreshToken: 'ref-token',
      expiresIn: 900,
    });

    const res = await controller.register(
      {
        displayName: 'Student Test',
        email: 's@test.com',
        password: 'Password123!',
        role: 'student',
      },
      mockReq,
      mockRes,
    );

    expect(mockAuthService.register).toHaveBeenCalled();
    expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'ref-token', expect.any(Object));
    expect(res.accessToken).toBe('acc-token');
  });

  it('POST /login should call authService.login and return token pair', async () => {
    const mockRes = { cookie: vi.fn() } as any;
    const mockReq = { headers: {}, socket: {} } as any;

    (mockAuthService.login as any).mockResolvedValueOnce({
      user: { id: 'u2', displayName: 'Guardian Test', email: 'g@test.com', roles: ['guardian'] },
      accessToken: 'acc-token-2',
      refreshToken: 'ref-token-2',
      expiresIn: 900,
    });

    const res = await controller.login(
      { identifier: 'g@test.com', password: 'Password123!' },
      mockReq,
      mockRes,
    );

    expect(mockAuthService.login).toHaveBeenCalled();
    expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'ref-token-2', expect.any(Object));
    expect(res.user.id).toBe('u2');
  });

  it('POST /logout should call authService.logout and clear cookie', async () => {
    const mockRes = { clearCookie: vi.fn() } as any;
    const mockReq = { cookies: { refresh_token: 'current-cookie-token' } } as any;

    (mockAuthService.logout as any).mockResolvedValueOnce({
      success: true,
      message: 'Logged out successfully',
    });

    const res = await controller.logout({}, mockReq, mockRes);

    expect(mockAuthService.logout).toHaveBeenCalledWith('current-cookie-token');
    expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    expect(res.success).toBe(true);
  });

  it('GET /me should return profile for authenticated user', async () => {
    (mockAuthService.getProfile as any).mockResolvedValueOnce({
      id: 'current-user-id',
      displayName: 'Authenticated User',
      email: 'auth@test.com',
      roles: ['guardian'],
    });

    const profile = await controller.getMe({
      id: 'current-user-id',
      roles: ['guardian'],
    });

    expect(mockAuthService.getProfile).toHaveBeenCalledWith('current-user-id');
    expect(profile.id).toBe('current-user-id');
  });

  it('GET /admin-only should allow execution', async () => {
    const res = await controller.adminOnlyCheck({
      id: 'admin-id',
      roles: ['admin'],
    });

    expect(res.message).toContain('privileged admin endpoint');
    expect(res.actor).toBe('admin-id');
  });
});
