import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Secrets that must never sign real tokens. Includes historical/dev defaults so an
 * auth-enabled deployment cannot boot with a publicly-known signing key.
 */
const FORBIDDEN_SECRETS = new Set([
  'dev-secret-change-me',
  'dev-insecure-secret-auth-disabled',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
]);

const MIN_SECRET_LENGTH = 32;

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.validateAuthConfig();
  }

  private validateAuthConfig(): void {
    // When auth is disabled, JwtAuthGuard short-circuits to the local user and the signing key is
    // never trusted, so no secret is required. Only enforce the contract when auth is enabled.
    const enableAuth = this.configService.get<boolean>('app.enableAuth');
    if (!enableAuth) {
      return;
    }

    this.assertStrongSecret(this.configService.get<string>('auth.jwt.secret'), 'JWT_SECRET');
    this.assertStrongSecret(this.configService.get<string>('auth.jwt.refreshSecret'), 'JWT_REFRESH_SECRET');
  }

  private assertStrongSecret(value: string | undefined, name: string): void {
    if (!value) {
      throw new Error(`${name} is required when auth is enabled (LOOPSTACK_AUTH=true). Set a strong, unique secret.`);
    }
    if (FORBIDDEN_SECRETS.has(value)) {
      throw new Error(`${name} is set to a known default/insecure value. Set a strong, unique secret.`);
    }
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters when auth is enabled.`);
    }
  }
}
