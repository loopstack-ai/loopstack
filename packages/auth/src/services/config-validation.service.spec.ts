import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigValidationService } from './config-validation.service.js';

const STRONG_SECRET = 'a'.repeat(32);
const STRONG_REFRESH_SECRET = 'b'.repeat(32);

function createService(config: Record<string, unknown>): ConfigValidationService {
  const configService = {
    get: vi.fn((key: string) => config[key]),
  } as unknown as ConfigService;
  return new ConfigValidationService(configService);
}

describe('ConfigValidationService', () => {
  const OLD_ALLOW_NO_AUTH = process.env.LOOPSTACK_ALLOW_NO_AUTH;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LOOPSTACK_ALLOW_NO_AUTH;
  });

  afterEach(() => {
    if (OLD_ALLOW_NO_AUTH === undefined) {
      delete process.env.LOOPSTACK_ALLOW_NO_AUTH;
    } else {
      process.env.LOOPSTACK_ALLOW_NO_AUTH = OLD_ALLOW_NO_AUTH;
    }
  });

  it('passes when auth is disabled in development even with no secret', () => {
    const service = createService({ 'app.enableAuth': false, 'app.nodeEnv': 'development' });
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('throws when auth is disabled in production without acknowledgment', () => {
    const service = createService({ 'app.enableAuth': false, 'app.nodeEnv': 'production' });
    expect(() => service.onModuleInit()).toThrow(/Refusing to start/);
  });

  it('passes when auth is disabled in production with LOOPSTACK_ALLOW_NO_AUTH=true', () => {
    process.env.LOOPSTACK_ALLOW_NO_AUTH = 'true';
    const service = createService({ 'app.enableAuth': false, 'app.nodeEnv': 'production' });
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('passes when auth is enabled with strong, distinct secrets', () => {
    const service = createService({
      'app.enableAuth': true,
      'auth.jwt.secret': STRONG_SECRET,
      'auth.jwt.refreshSecret': STRONG_REFRESH_SECRET,
    });
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('throws when auth is enabled but the secret is missing', () => {
    const service = createService({ 'app.enableAuth': true, 'auth.jwt.refreshSecret': STRONG_REFRESH_SECRET });
    expect(() => service.onModuleInit()).toThrow(/JWT_SECRET is required/);
  });

  it('throws when auth is enabled but the refresh secret is missing', () => {
    const service = createService({ 'app.enableAuth': true, 'auth.jwt.secret': STRONG_SECRET });
    expect(() => service.onModuleInit()).toThrow(/JWT_REFRESH_SECRET is required/);
  });

  it('throws when auth is enabled but the secret is a known default', () => {
    const service = createService({
      'app.enableAuth': true,
      'auth.jwt.secret': 'dev-secret-change-me',
      'auth.jwt.refreshSecret': STRONG_REFRESH_SECRET,
    });
    expect(() => service.onModuleInit()).toThrow(/known default\/insecure value/);
  });

  it('throws when auth is enabled but the secret is too short', () => {
    const service = createService({
      'app.enableAuth': true,
      'auth.jwt.secret': 'short-secret',
      'auth.jwt.refreshSecret': STRONG_REFRESH_SECRET,
    });
    expect(() => service.onModuleInit()).toThrow(/at least 32 characters/);
  });
});
