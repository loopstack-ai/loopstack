import { Global, Module } from '@nestjs/common';
import { OAuthCallbackController } from './controllers/index.js';
import { OAuthProviderRegistry } from './services/oauth-provider-registry.js';
import { OAuthSessionService } from './services/oauth-session.service.js';
import { OAuthTokenStore } from './services/oauth-token-store.js';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from './tools/index.js';
import { OAuthWorkflow } from './workflows/index.js';

/**
 * NestJS module that provides the provider-agnostic OAuth 2.0 framework — the
 * `OAuthProviderRegistry` and `OAuthTokenStore` services, the `build_oauth_url` and
 * `exchange_oauth_token` tools, and the generic `OAuthWorkflow` for the authorization code flow.
 *
 * Registration:
 * - `OAuthModule` — a bare import is enough. The module is `@Global()`, so a single import anywhere
 *   makes its services, tools, and workflow available application-wide via DI; no static
 *   configuration method exists.
 *
 * Requires: at least one OAuth provider implementing `OAuthProviderInterface` must be registered
 * for authentication to do anything useful — provider modules (e.g. `@loopstack/google-workspace-module`
 * or `@loopstack/github-module`) self-register on init via `OAuthProviderRegistry`. Token persistence
 * uses Redis (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`) but is optional, falling back to in-memory
 * storage when Redis is unavailable.
 *
 * @public
 */
@Global()
@Module({
  controllers: [OAuthCallbackController],
  providers: [
    OAuthProviderRegistry,
    OAuthSessionService,
    OAuthTokenStore,
    BuildOAuthUrlTool,
    ExchangeOAuthTokenTool,
    OAuthWorkflow,
  ],
  exports: [
    OAuthProviderRegistry,
    OAuthSessionService,
    OAuthTokenStore,
    BuildOAuthUrlTool,
    ExchangeOAuthTokenTool,
    OAuthWorkflow,
  ],
})
export class OAuthModule {}
