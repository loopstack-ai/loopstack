---
title: OAuth Authentication
description: Integrating OAuth 2.0 authentication using @loopstack/oauth-module. Covers setup with Google Workspace provider, token management, and accessing OAuth-protected APIs from workflows.
---

# OAuth Authentication

Add OAuth 2.0 authentication to your workflows using the provider-agnostic `@loopstack/oauth-module`. Register providers like Google Workspace or GitHub, and access OAuth-protected APIs from any workflow or tool.

## How It Works

The module is split into three layers:

1. **Provider registry** — provider modules (Google, GitHub, etc.) implement `OAuthProviderInterface` and self-register at module init. The registry resolves a provider by name at call time.
2. **OAuth workflow** — a generic `OAuthWorkflow` that builds the auth URL, surfaces a sign-in prompt via `OAuthPromptDocument`, waits for the browser callback, and exchanges the auth code for tokens. Run it as a sub-workflow from any parent workflow.
3. **Token store** — `OAuthTokenStore` persists access/refresh tokens per user per provider in Redis (falls back to in-memory when Redis is unavailable). `getValidAccessToken()` automatically refreshes expired tokens via the provider's `refreshToken()` method.

```
start ──► initiateOAuth ──► awaiting_auth ──► exchangeToken ──► end
              │                                     │
              │  Builds auth URL,                    │  Validates CSRF state,
              │  saves OAuthPromptDocument           │  exchanges code,
              │  with sign-in prompt                 │  stores tokens
              ▼                                      ▼
         (waits for user to                    (callback resumes
          complete OAuth in browser)            parent workflow)
```

Tools that need an access token call `OAuthTokenStore.getValidAccessToken(userId, provider)` and return `{ error: 'unauthorized' }` if no valid token exists, which lets the parent workflow guard branch into running `OAuthWorkflow`.

## Setup

```typescript
import { Module } from '@nestjs/common';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';

@Module({
  imports: [GoogleWorkspaceModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

`GoogleWorkspaceModule` and `GitHubModule` import `OAuthModule` internally — you don't need to add it explicitly. For a custom provider, import `OAuthModule` directly alongside your provider module:

```typescript
import { OAuthModule } from '@loopstack/oauth-module';
import { MyCustomOAuthModule } from './my-custom-oauth.module';

@Module({
  imports: [OAuthModule, MyCustomOAuthModule],
  providers: [MyWorkflow],
})
export class MyModule {}
```

`OAuthModule` is decorated with `@Global()`, so a single import makes the registry, token store, and OAuth tools available throughout your app.

## OAuth as Sub-Workflow

The simplest approach: launch the built-in `OAuthWorkflow` when authentication is needed.

```typescript
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { MarkdownDocument } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';

interface CalendarState {
  events?: CalendarEvent[];
  requiresAuthentication?: boolean;
}

type CalendarArgs = { calendarId: string };

@Workflow({ widget: __dirname + '/calendar.ui.yaml' })
export class CalendarWorkflow extends BaseWorkflow<CalendarArgs> {
  constructor(
    private readonly calendarFetchEvents: CalendarFetchEventsTool,
    private readonly oAuth: OAuthWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'calendar_fetched' })
  async fetchEvents(state: CalendarState, ctx: RunContext<CalendarArgs>) {
    const result = await this.calendarFetchEvents.call({
      calendarId: ctx.args.calendarId,
    });
    this.assignState({
      requiresAuthentication: result.data.error === 'unauthorized',
      events: result.data.events,
    });
  }

  // If unauthorized -> launch OAuth sub-workflow
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

  // After auth -> retry from start
  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  authCompleted(state: CalendarState, _input: TransitionInput) {}

  // Success -> display results
  @Transition({ from: 'calendar_fetched', to: 'end' })
  async displayResults(state: CalendarState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/summary.md', { events: state.events }),
    });
  }
}
```

## Using Tokens in Custom Tools

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

@Tool({
  name: 'calendar_fetch_events',
  description: 'Fetches Google Calendar events.',
  schema: z.object({ calendarId: z.string().default('primary') }).strict(),
})
export class CalendarFetchEventsTool extends BaseTool {
  constructor(private readonly tokenStore: OAuthTokenStore) {
    super();
  }

  protected async handle(args: { calendarId: string }, ctx: RunContext): Promise<ToolEnvelope> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return { data: { error: 'unauthorized' } };
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${args.calendarId}/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return { data: await response.json() };
  }
}
```

## Creating a Custom OAuth Provider

See [Creating OAuth Providers](../../extend/oauth-providers.md) for how to implement `OAuthProviderInterface` and register a custom provider.

## Environment Variables

Each OAuth provider reads its own credentials from env, conventionally named `<PROVIDER>_CLIENT_ID`, `<PROVIDER>_CLIENT_SECRET`, and `<PROVIDER>_OAUTH_REDIRECT_URI`:

```
# Google Workspace
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=...

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_OAUTH_REDIRECT_URI=...
```

The token store also reads `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` — see [Configuration Reference](../../reference/configuration.md) for defaults. Redis is optional; an in-memory fallback is used when unavailable.

## Token Lifecycle

1. `OAuthWorkflow` generates auth URL and shows it to the user
2. User completes OAuth in browser
3. Token is exchanged and stored per user per provider
4. `OAuthTokenStore.getValidAccessToken()` auto-refreshes expired tokens
5. Tools return `{ error: 'unauthorized' }` if no token exists
6. Workflow guard detects the error and launches OAuth sub-workflow

## Registry References

- [google-oauth-example](https://loopstack.ai/registry/loopstack-google-oauth-example) — Google Calendar fetch with OAuth sub-workflow, custom calendar tool, and Google Workspace agent with tool calling
- [github-oauth-example](https://loopstack.ai/registry/loopstack-github-oauth-example) — GitHub OAuth integration with repos overview and GitHub agent with 25+ tools
