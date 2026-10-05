import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AuthService, TokenService } from '../services/index.js';
import { AuthController } from './auth.controller.js';

function createController(config: Record<string, unknown>): AuthController {
  const configService = { get: vi.fn((key: string) => config[key]) } as unknown as ConfigService;
  const tokenService = new TokenService(configService, {} as JwtService);
  return new AuthController({} as AuthService, tokenService);
}

describe('AuthController', () => {
  describe('logout', () => {
    it('clears both auth cookies with the options they were set with', () => {
      const controller = createController({
        'auth.clientId': 'local',
        'auth.jwt.cookieDomain': '.example.com',
        'auth.jwt.expiresIn': '1h',
        'auth.jwt.refreshExpiresIn': '7d',
      });
      const res = { clearCookie: vi.fn() } as unknown as Response;

      controller.logout(res);

      const cookieAttributes = { domain: '.example.com', httpOnly: true, secure: true, sameSite: 'none' };
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith('local-access', expect.objectContaining(cookieAttributes));
      expect(res.clearCookie).toHaveBeenCalledWith('local-refresh', expect.objectContaining(cookieAttributes));
    });

    it('clears host-only cookies when no cookie domain is configured', () => {
      const controller = createController({ 'auth.clientId': 'local' });
      const res = { clearCookie: vi.fn() } as unknown as Response;

      controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'local-access',
        expect.objectContaining({ domain: undefined, secure: true, sameSite: 'none' }),
      );
    });
  });
});
