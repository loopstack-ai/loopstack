---
title: OAuth Module
description: Provider-agnostic OAuth 2.0 framework for Loopstack — OAuthModule, OAuthWorkflow, OAuthProviderRegistry, OAuthTokenStore, OAuthProviderInterface, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthPromptDocument, token storage with Redis fallback, pluggable provider interface, authorization code flow
---

# @loopstack/oauth-module

> OAuth module for the [Loopstack](https://loopstack.ai) automation framework.

A provider-agnostic OAuth 2.0 framework that handles the full authorization code flow — URL generation, code exchange, token storage, and automatic refresh. Any provider (Google, GitHub, Microsoft, etc.) can be plugged in by implementing a single interface.

## When to Use

- You need OAuth 2.0 authentication in your workflows (e.g. accessing Google Calendar, GitHub repos, or any third-party API)
- You want a reusable sub-workflow that handles the entire auth flow (popup, code exchange, token storage) and resumes the parent workflow on completion
- You are building a custom OAuth provider integration and need a standardized registration and token management layer
- Use `@loopstack/google-workspace-module` or `@loopstack/github-module` directly if you only need Google or GitHub — they include their own providers and import `OAuthModule` internally

## Installation

```bash
npm install @loopstack/oauth-module
```

Register the module in your NestJS module. `OAuthModule` is `@Global()`, so a single import makes its services available everywhere:

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';

@Module({
  imports: [OAuthModule],
})
export class AppModule {}
```

## Quick Start

Inject `OAuthWorkflow` into your workflow and launch it as a sub-workflow when authentication is needed:

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';

const CalendarSchema = z.object({ calendarId: z.string().default('primary') }).strict();
type CalendarArgs = z.infer<typeof CalendarSchema>;

@Workflow({
  schema: CalendarSchema,
})
export class CalendarWorkflow extends BaseWorkflow<CalendarArgs> {
  constructor(
    private readonly calendarFetchEvents: CalendarFetchEventsTool,
    private readonly oAuth: OAuthWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'calendar_fetched' })
  async fetchEvents(state: CalendarState, ctx: RunContext<CalendarArgs>) {
    const result = await this.calendarFetchEvents.call({ calendarId: ctx.args.calendarId });
    this.assignState({
      requiresAuthentication: result.data.error === 'unauthorized',
      events: result.data.events,
    });
  }

  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(state: CalendarState) {
    await this.oAuth.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { callback: { transition: 'authCompleted' }, show: 'inline', label: 'Google authentication required' },
    );
  }

  needsAuth(state: CalendarState): boolean {
    return !!state.requiresAuthentication;
  }

  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  authCompleted(state: CalendarState, _input: TransitionInput) {}

  @Transition({ from: 'calendar_fetched', to: 'end' })
  async displayResults(state: CalendarState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(join(__dirname, 'templates', 'summary.md'), { events: state.events }),
    });
  }
}
```

`show: 'inline'` (the default) renders the OAuth sub-workflow as an embedded iframe in the parent's run view, so the user can complete authentication without leaving the page.

## How It Works

### Architecture

```
oauth-module (generic)              provider module (e.g. google)
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  OAuthProviderRegistry       │◄───│  GoogleWorkspaceOAuthProvider│
│  OAuthTokenStore             │    │  (implements interface,      │
│  BuildOAuthUrlTool           │    │   registers on init)         │
│  ExchangeOAuthTokenTool      │    └──────────────────────────────┘
│  OAuthWorkflow               │
│  OAuthPromptDocument         │    consumer workflow
└──────────────────────────────┘    ┌──────────────────────────────┐
                                    │  uses OAuthTokenStore        │
                                    │  launches OAuthWorkflow      │
                                    │  via constructor injection   │
                                    └──────────────────────────────┘
```

The module is split into four layers:

1. **Provider registry** — provider modules implement `OAuthProviderInterface` and self-register via `OnModuleInit`
2. **OAuth workflow** — a generic workflow that builds the auth URL, shows a sign-in prompt, waits for the callback, then exchanges the code for tokens
3. **Token store** — persists tokens per user per provider in Redis (falls back to in-memory if Redis is unavailable)
4. **Public callback endpoints** — complete the flow from `code` + `state` alone; the single-use state token (10 minute TTL, registered via `OAuthSessionService` when the auth URL is built) resolves the pending workflow server-side

### Callback / Redirect URI Modes

The provider's `*_OAUTH_REDIRECT_URI` can point at either of two supported targets (register the one you use in the provider console):

| Redirect URI                  | How the flow completes                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<api>/api/v1/oauth/callback` | **Backend callback.** The API completes the exchange server-side and renders a minimal confirmation page. Works without the Studio frontend — CLI-printed auth URLs and headless deployments.             |
| `<studio>/oauth/callback`     | **Studio callback page.** Opened as a popup from Studio it posts `code`/`state` back to the opener (classic flow); opened directly (e.g. from a CLI link) it falls back to `POST /api/v1/oauth/complete`. |

Both paths fire the waiting workflow's `exchangeToken` transition as the user who started the flow; the state parameter stays the CSRF anchor and is additionally single-use server-side.

### OAuthWorkflow State Machine

```
start ──► initiateOAuth ──► awaiting_auth ──► exchangeToken ──► end
              │                                     │
              │  Builds auth URL via                 │  Validates CSRF state,
              │  BuildOAuthUrlTool,                  │  exchanges code via
              │  saves OAuthPromptDocument           │  ExchangeOAuthTokenTool,
              │  with sign-in prompt                 │  stores tokens, updates
              │                                      │  document to 'success'
              ▼                                      ▼
         (waits for user to                    (callback resumes
          complete OAuth in browser)            parent workflow)
```

### Token Lifecycle

1. `OAuthWorkflow` calls `BuildOAuthUrlTool` to generate an auth URL with a CSRF state parameter
2. The user completes OAuth in the browser popup
3. The callback triggers `exchangeToken`, which validates the state and calls `ExchangeOAuthTokenTool`
4. Tokens are stored per user per provider via `OAuthTokenStore`
5. `OAuthTokenStore.getValidAccessToken()` automatically refreshes expired tokens using the provider's `refreshToken()` method
6. Tools return `{ error: 'unauthorized' }` when no valid token exists, triggering the workflow guard

### Using Tokens in Custom Tools

Inject `OAuthTokenStore` to access stored tokens:

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

@Tool({
  name: 'my_api_fetch',
  description: 'Fetches data from an OAuth-protected API.',
  schema: z.object({ query: z.string() }).strict(),
})
export class MyApiFetchTool extends BaseTool {
  constructor(private readonly tokenStore: OAuthTokenStore) {
    super();
  }

  protected async handle(args: { query: string }, ctx: RunContext): Promise<ToolEnvelope> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'my-provider');

    if (!accessToken) {
      return { data: { error: 'unauthorized' } };
    }

    const response = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return { data: await response.json() };
  }
}
```

## Args Reference

### OAuthWorkflow

| Arg        | Type       | Required | Description                                                      |
| ---------- | ---------- | -------- | ---------------------------------------------------------------- |
| `provider` | `string`   | Yes      | Provider ID (e.g. `'google'`, `'github'`)                        |
| `scopes`   | `string[]` | No       | OAuth scopes to request (defaults to provider's `defaultScopes`) |

**Run options:**

| Option     | Type     | Description                                                                              |
| ---------- | -------- | ---------------------------------------------------------------------------------------- |
| `callback` | `object` | `{ transition: string }` — transition to call on the parent workflow when auth completes |

**Returns:** `{ authenticated: boolean }`

## Tools Reference

### `build_oauth_url`

Builds an OAuth 2.0 authorization URL for the given provider with a CSRF state parameter.

| Arg        | Type       | Required | Description             |
| ---------- | ---------- | -------- | ----------------------- |
| `provider` | `string`   | Yes      | Provider ID             |
| `scopes`   | `string[]` | Yes      | OAuth scopes to request |

**Returns:** `{ authUrl: string, state: string }`

### `exchange_oauth_token`

Exchanges an OAuth 2.0 authorization code for access and refresh tokens, validates the CSRF state, and stores the tokens globally for the user.

| Arg             | Type     | Required | Description                            |
| --------------- | -------- | -------- | -------------------------------------- |
| `provider`      | `string` | Yes      | Provider ID                            |
| `code`          | `string` | Yes      | Authorization code from OAuth callback |
| `state`         | `string` | Yes      | State parameter from callback          |
| `expectedState` | `string` | Yes      | Expected state for CSRF validation     |

**Returns:** `{ accessToken: string, refreshToken: string | undefined, expiresIn: number | undefined, scope: string | undefined }`

## Configuration

### Redis (Token Storage)

`OAuthTokenStore` connects to Redis for persistent token storage. If Redis is unavailable, it falls back to in-memory storage.

| Env Variable     | Default     | Description    |
| ---------------- | ----------- | -------------- |
| `REDIS_HOST`     | `localhost` | Redis host     |
| `REDIS_PORT`     | `6379`      | Redis port     |
| `REDIS_PASSWORD` | —           | Redis password |

Tokens with refresh tokens are stored with a 30-day TTL. Access-only tokens expire based on their `expiresIn` value.

## Service Reference

### OAuthProviderRegistry

Manages registered OAuth providers at runtime.

| Method               | Description                              |
| -------------------- | ---------------------------------------- |
| `register(provider)` | Register a provider instance             |
| `get(providerId)`    | Get a provider by ID (throws if missing) |
| `has(providerId)`    | Check if a provider is registered        |

### OAuthTokenStore

Stores and retrieves OAuth tokens per user and provider. Uses Redis with in-memory fallback.

| Method                                       | Description                                                       |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `storeTokens(userId, providerId, tokens)`    | Store a `StoredTokens` object for a user/provider pair            |
| `storeFromTokenSet(userId, providerId, set)` | Store tokens from an `OAuthTokenSet` (auto-calculates expiry)     |
| `getTokens(userId, providerId)`              | Get stored tokens (may be expired)                                |
| `getValidAccessToken(userId, providerId)`    | Get a valid access token, auto-refreshing if expired and possible |

## Provider Interface Reference

Implement `OAuthProviderInterface` to add a new OAuth provider:

```typescript
interface OAuthProviderInterface {
  readonly providerId: string; // Unique identifier, e.g. 'google', 'github'
  readonly defaultScopes: string[]; // Fallback scopes when none are specified

  buildAuthUrl(scopes: string[], state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
}

interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // Seconds until expiry
  scope: string;
}
```

| Method         | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `buildAuthUrl` | Construct the OAuth authorization URL for the user to visit |
| `exchangeCode` | Exchange the authorization code for tokens after redirect   |
| `refreshToken` | Refresh an expired access token using the refresh token     |

The provider self-registers via NestJS `OnModuleInit`:

```typescript
@Injectable()
export class MyOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  readonly providerId = 'my-provider';
  readonly defaultScopes = ['read', 'write'];

  constructor(private readonly registry: OAuthProviderRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  buildAuthUrl(scopes: string[], state: string): string {
    /* ... */
  }
  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    /* ... */
  }
  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    /* ... */
  }
}
```

Wrap it in a module that imports `OAuthModule`:

```typescript
@Module({
  imports: [OAuthModule],
  providers: [MyOAuthProvider],
  exports: [MyOAuthProvider],
})
export class MyOAuthModule {}
```

### Existing Providers

| Provider | Module                               | Provider ID |
| -------- | ------------------------------------ | ----------- |
| Google   | `@loopstack/google-workspace-module` | `'google'`  |
| GitHub   | `@loopstack/github-module`           | `'github'`  |

## Document Types

### OAuthPromptDocument

Rendered by the `oauth-prompt` widget. Used internally by the `OAuthWorkflow` to show the sign-in prompt with a popup-based authentication flow.

| Field      | Type                                | Description                 |
| ---------- | ----------------------------------- | --------------------------- |
| `provider` | `string`                            | Provider ID                 |
| `authUrl`  | `string`                            | The OAuth authorization URL |
| `state`    | `string`                            | CSRF state parameter        |
| `status`   | `'pending' \| 'success' \| 'error'` | Current auth status         |
| `message`  | `string` (optional)                 | Status message              |

## Public API

**Module**

- `OAuthModule` — global NestJS module, registers all providers/services/tools/workflows

**Services**

- `OAuthProviderRegistry` — runtime registry for OAuth providers
- `OAuthTokenStore` — token persistence with Redis/in-memory fallback

**Tools**

- `BuildOAuthUrlTool` (`build_oauth_url`) — generates authorization URLs
- `ExchangeOAuthTokenTool` (`exchange_oauth_token`) — exchanges codes for tokens

**Workflows**

- `OAuthWorkflow` — generic OAuth 2.0 authorization code flow

**Documents**

- `OAuthPromptDocument` — sign-in prompt rendered by `oauth-prompt` widget

**Contracts**

- `OAuthProviderInterface` — interface for pluggable OAuth providers
- `OAuthTokenSet` — token response shape returned by providers
- `StoredTokens` — internal token storage shape (includes `expiresAt`)

## Dependencies

| Package             | Role                                  |
| ------------------- | ------------------------------------- |
| `@loopstack/common` | Base classes, decorators, types       |
| `@loopstack/core`   | Workflow engine, sub-workflow support |
| `ioredis`           | Redis client for token storage        |
| `zod`               | Schema validation                     |

## Related

- [OAuth Authentication](https://loopstack.ai/docs/build/integrations/oauth) — guide for integrating OAuth into workflows, using tokens in tools, and the try-then-authenticate pattern
- [Creating OAuth Providers](https://loopstack.ai/docs/extend/oauth-providers) — step-by-step guide for implementing `OAuthProviderInterface`
- [google-oauth-example](https://loopstack.ai/registry/loopstack-google-oauth-example) — Google Calendar fetch with OAuth sub-workflow and Google Workspace agent
- [github-oauth-example](https://loopstack.ai/registry/loopstack-github-oauth-example) — GitHub OAuth with repos overview workflow and 25+ GitHub tools

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
