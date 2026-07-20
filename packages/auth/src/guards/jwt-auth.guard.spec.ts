import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserTypeEnum } from '@loopstack/common';
import type { UserRepository } from '../repositories/index.js';
import type { ApiTokenService } from '../services/api-token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

interface MockRequest {
  headers: Record<string, string>;
  cookies?: Record<string, string>;
  user?: unknown;
}

function createContext(request: MockRequest): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector;
  const apiTokenService = { validate: vi.fn() };
  const localUser = { id: 'local-user-1', type: UserTypeEnum.Local, isActive: true, roles: [{ name: 'ADMIN' }] };
  const userRepository = { findOrCreateLocalUser: vi.fn(async () => localUser) };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    const configService = {
      get: vi.fn((key: string) => (key === 'auth.clientId' ? 'worker-1' : false)),
    } as unknown as ConfigService;
    guard = new JwtAuthGuard(
      reflector,
      configService,
      apiTokenService as unknown as ApiTokenService,
      userRepository as unknown as UserRepository,
    );
  });

  it('allows public endpoints without credentials', async () => {
    (reflector.getAllAndOverride as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    expect(await guard.canActivate(createContext({ headers: {} }))).toBe(true);
  });

  it('resolves lsk_ bearers through the token store', async () => {
    const patUser = { userId: 'user-1', type: UserTypeEnum.Local, workerId: 'worker-1', roles: [] };
    apiTokenService.validate.mockResolvedValue(patUser);
    const request: MockRequest = { headers: { authorization: 'Bearer lsk_valid' } };

    expect(await guard.canActivate(createContext(request))).toBe(true);
    expect(request.user).toEqual(patUser);
    expect(apiTokenService.validate).toHaveBeenCalledWith('lsk_valid');
  });

  it('rejects invalid lsk_ bearers with 401', async () => {
    apiTokenService.validate.mockResolvedValue(null);
    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer lsk_revoked' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resolves credential-less requests to the local dev user when auth is disabled', async () => {
    const request: MockRequest = { headers: {} };
    expect(await guard.canActivate(createContext(request))).toBe(true);
    expect(request.user).toEqual({
      userId: 'local-user-1',
      type: UserTypeEnum.Local,
      workerId: 'worker-1',
      roles: ['ADMIN'],
    });
    expect(userRepository.findOrCreateLocalUser).toHaveBeenCalledOnce();
  });

  it('does not shortcut to the local user when a cookie credential is present', async () => {
    // With a cookie present, the guard must go through real JWT validation —
    // which rejects the bogus cookie here.
    const request: MockRequest = { headers: {}, cookies: { 'worker-1-access': 'some-jwt' } };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow();
  });
});
