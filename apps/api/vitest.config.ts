import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh',
      ALLOW_TEST_AUTH_BYPASS: 'true',
      PORT: '4000',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/ogroniedu_dev',
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  },
});
