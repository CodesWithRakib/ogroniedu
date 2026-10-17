import { describe, it, expect } from 'vitest';
import { isSwaggerEnabled } from '../src/config/swagger';

describe('Swagger env gating (SEC-6)', () => {
  it('mounts /api/docs outside production only', () => {
    expect(isSwaggerEnabled({})).toBe(true);
    expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isSwaggerEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isSwaggerEnabled({ NODE_ENV: 'staging' })).toBe(true);
    expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });
});
