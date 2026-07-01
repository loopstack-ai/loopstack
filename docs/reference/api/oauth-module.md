---
title: API: @loopstack/oauth-module
description: Public API reference for @loopstack/oauth-module
includeInLlmsFullTxt: false
---

# API: @loopstack/oauth-module

## Classes

### BuildOAuthUrlTool

Tool that builds an OAuth 2.0 authorization URL for a provider, including a CSRF state parameter.

```ts
import { BuildOAuthUrlTool } from '@loopstack/oauth-module';
```

**Provided by:** `OAuthModule`

```ts
export class BuildOAuthUrlTool extends BaseTool<BuildOAuthUrlArgs, object, BuildOAuthUrlResult> {
  protected handle(args: BuildOAuthUrlArgs): Promise<ToolEnvelope<BuildOAuthUrlResult>>;
}
```

### ExchangeOAuthTokenTool

Tool that exchanges an OAuth 2.0 authorization code for access and refresh tokens and stores them for the user.

```ts
import { ExchangeOAuthTokenTool } from '@loopstack/oauth-module';
```

**Provided by:** `OAuthModule`

```ts
export class ExchangeOAuthTokenTool extends BaseTool<ExchangeOAuthTokenArgs, object, ExchangeOAuthTokenResult> {
  protected handle(args: ExchangeOAuthTokenArgs, ctx: RunContext): Promise<ToolEnvelope<ExchangeOAuthTokenResult>>;
}
```

### OAuthModule

NestJS module that provides the provider-agnostic OAuth 2.0 framework — the
`OAuthProviderRegistry` and `OAuthTokenStore` services, the `build_oauth_url` and
`exchange_oauth_token` tools, and the generic `OAuthWorkflow` for the authorization code flow.

Registration:

- `OAuthModule` — a bare import is enough. The module is `@Global()`, so a single import anywhere
  makes its services, tools, and workflow available application-wide via DI; no static
  configuration method exists.

Requires: at least one OAuth provider implementing `OAuthProviderInterface` must be registered
for authentication to do anything useful — provider modules (e.g. `@loopstack/google-workspace-module`
or `@loopstack/github-module`) self-register on init via `OAuthProviderRegistry`. Token persistence
uses Redis (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`) but is optional, falling back to in-memory
storage when Redis is unavailable.

```ts
import { OAuthModule } from '@loopstack/oauth-module';
```

```ts
export class OAuthModule {}
```

### OAuthPromptDocument

Document that renders the OAuth authorization prompt (provider, auth URL, and connection status) in Studio.

```ts
import { OAuthPromptDocument } from '@loopstack/oauth-module';
```

```ts
export class OAuthPromptDocument {
  provider: string;
  authUrl: string;
  state: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}
```

### OAuthTokenStore

Service that stores and retrieves per-user OAuth tokens (Redis-backed, with in-memory fallback) and
transparently refreshes expired access tokens; inject it to read a valid access token for a provider.

```ts
import { OAuthTokenStore } from '@loopstack/oauth-module';
```

**Provided by:** `OAuthModule`

```ts
export class OAuthTokenStore implements OnModuleDestroy {
  constructor();
  onModuleDestroy(): void;
  storeTokens(userId: string, providerId: string, tokens: StoredTokens): Promise<void>;
  storeFromTokenSet(userId: string, providerId: string, tokenSet: OAuthTokenSet): Promise<void>;
  getTokens(userId: string, providerId: string): Promise<StoredTokens | undefined>;
  getValidAccessToken(userId: string, providerId: string): Promise<string | undefined>;
}
```

### OAuthWorkflow

Workflow that runs the OAuth 2.0 authorization code flow for a provider: it builds the auth URL, prompts
the user via an `OAuthPromptDocument`, and exchanges the returned code for stored tokens. Run it standalone
to pre-authenticate or invoke it from another workflow when authentication is required.

```ts
import { OAuthWorkflow } from '@loopstack/oauth-module';
```

**Provided by:** `OAuthModule`

```ts
export class OAuthWorkflow extends BaseWorkflow<OAuthArgs> {
  constructor(buildOAuthUrl: BuildOAuthUrlTool, exchangeOAuthToken: ExchangeOAuthTokenTool);
  initiateOAuth(state: OAuthState, ctx: RunContext<OAuthArgs>): Promise<void>;
  exchangeToken(
    state: OAuthState,
    input: TransitionInput<{
      code: string;
      state: string;
    }>,
  ): Promise<void>;
}
```

## Interfaces

### BuildOAuthUrlResult

Result for `BuildOAuthUrlTool`.

```ts
import { BuildOAuthUrlResult } from '@loopstack/oauth-module';
```

```ts
export interface BuildOAuthUrlResult {
  authUrl: string;
  state: string;
}
```

### OAuthProviderInterface

Contract that an OAuth 2.0 provider implements to plug into the OAuth framework; implement it to add a new provider.

```ts
import { OAuthProviderInterface } from '@loopstack/oauth-module';
```

```ts
export interface OAuthProviderInterface {
  readonly providerId: string;
  readonly defaultScopes: string[];
  buildAuthUrl(scopes: string[], state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
}
```

### OAuthTokenSet

Token set returned by an OAuth provider after a code exchange or refresh.

```ts
import { OAuthTokenSet } from '@loopstack/oauth-module';
```

```ts
export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}
```

### StoredTokens

Persisted OAuth token record held by `OAuthTokenStore`.

```ts
import { StoredTokens } from '@loopstack/oauth-module';
```

```ts
export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}
```

## Type Aliases

### BuildOAuthUrlArgs

Args for `BuildOAuthUrlTool`.

```ts
import { BuildOAuthUrlArgs } from '@loopstack/oauth-module';
```

```ts
export type BuildOAuthUrlArgs = z.infer<typeof BuildOAuthUrlSchema>;
```

### ExchangeOAuthTokenArgs

Args for `ExchangeOAuthTokenTool`.

```ts
import { ExchangeOAuthTokenArgs } from '@loopstack/oauth-module';
```

```ts
export type ExchangeOAuthTokenArgs = z.infer<typeof ExchangeOAuthTokenSchema>;
```

### ExchangeOAuthTokenResult

Result for `ExchangeOAuthTokenTool`.

```ts
import { ExchangeOAuthTokenResult } from '@loopstack/oauth-module';
```

```ts
export type ExchangeOAuthTokenResult = {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number | undefined;
  scope: string | undefined;
};
```

## Variables

### BuildOAuthUrlSchema

Zod schema for `BuildOAuthUrlTool` args.

```ts
import { BuildOAuthUrlSchema } from '@loopstack/oauth-module';
```

```ts
BuildOAuthUrlSchema: z.ZodObject<
  {
    provider: z.ZodString;
    scopes: z.ZodArray<z.ZodString>;
  },
  z.core.$strict
>;
```

### ExchangeOAuthTokenSchema

Zod schema for `ExchangeOAuthTokenTool` args.

```ts
import { ExchangeOAuthTokenSchema } from '@loopstack/oauth-module';
```

```ts
ExchangeOAuthTokenSchema: z.ZodObject<
  {
    provider: z.ZodString;
    code: z.ZodString;
    state: z.ZodString;
    expectedState: z.ZodString;
  },
  z.core.$strict
>;
```

### OAuthPromptDocumentSchema

Zod schema for `OAuthPromptDocument`.

```ts
import { OAuthPromptDocumentSchema } from '@loopstack/oauth-module';
```

```ts
OAuthPromptDocumentSchema: z.ZodObject<
  {
    provider: z.ZodString;
    authUrl: z.ZodString;
    state: z.ZodString;
    status: z.ZodDefault<
      z.ZodEnum<{
        success: 'success';
        pending: 'pending';
        error: 'error';
      }>
    >;
    message: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```
