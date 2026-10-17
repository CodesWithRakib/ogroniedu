import 'reflect-metadata';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

/**
 * F-3 regression tripwire (Phase 24 Pre-Gate PG-1).
 *
 * The global ValidationPipe resolves DTO metatypes from the `design:paramtypes`
 * decorator metadata. Runtimes that cannot emit it (tsx/esbuild — the F-3 dev
 * runtime) silently skip validation: malformed bodies reach the service and, a
 * layer deeper, the database (the F-4 curated-tutor 500). This spec boots the
 * real controller with the real global pipe configuration. If the transform in
 * use stops emitting metadata, the invalid-body tests fail because AuthService
 * is reached instead of a 400 being returned.
 */
describe('HTTP validation boundary (F-3 tripwire)', () => {
  let app: INestApplication;
  const login = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  }, 30_000);

  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue({
      user: { id: 'u-1', displayName: 'Demo Student', email: 'student.demo@ogroniedu.com' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects an empty login body with 400 without reaching the service', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects unknown properties with 400 (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'student.demo@ogroniedu.com', password: 'whatever', isAdmin: true });

    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects constraint violations with 400 (MinLength)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'a', password: '' });

    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('lets a valid body through to the service (proves metatype resolution)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'student.demo@ogroniedu.com', password: 'OgroniDev#2026' });

    expect(res.status).toBe(200);
    expect(login).toHaveBeenCalledWith(
      { identifier: 'student.demo@ogroniedu.com', password: 'OgroniDev#2026' },
      expect.any(Object),
    );
  });
});
