# OAuth Authentication

`@loopstack/oauth-module` provides a provider-agnostic OAuth 2.0 framework. `@loopstack/google-workspace-module` adds Google as a provider.

## Setup

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';

@Module({
  imports: [LoopCoreModule, GoogleWorkspaceModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

## OAuth as Sub-Workflow

The simplest approach: launch the built-in `OAuthWorkflow` when authentication is needed.

```typescript
import { BaseWorkflow, CallbackSchema, Guard, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { LinkDocument, MarkdownDocument } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';

interface CalendarState {
  events?: CalendarEvent[];
  requiresAuthentication?: boolean;
}

@Workflow({ widget: __dirname + '/calendar.ui.yaml' })
export class CalendarWorkflow extends BaseWorkflow<{ calendarId: string }, CalendarState> {
  constructor(
    private readonly calendarFetchEvents: CalendarFetchEventsTool,
    private readonly oAuth: OAuthWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'calendar_fetched' })
  async fetchEvents(state: CalendarState, ctx: LoopstackContext): Promise<CalendarState> {
    const args = ctx.args as { calendarId: string };
    const result = await this.calendarFetchEvents.call({
      calendarId: args.calendarId,
    });
    return {
      ...state,
      requiresAuthentication: result.data!.error === 'unauthorized',
      events: result.data!.events,
    };
  }

  // If unauthorized -> launch OAuth sub-workflow
  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(state: CalendarState): Promise<CalendarState> {
    const result = await this.oAuth.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { alias: 'oAuth', callback: { transition: 'authCompleted' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Google authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  needsAuth(state: CalendarState): boolean {
    return !!state.requiresAuthentication;
  }

  // After auth -> retry from start
  @Transition({ from: 'awaiting_auth', to: 'start', wait: true, schema: CallbackSchema })
  async authCompleted(state: CalendarState, payload: { workflowId: string }): Promise<CalendarState> {
    await this.documentStore.save(
      LinkDocument,
      {
        status: 'success',
        label: 'Google authentication completed',
        workflowId: payload.workflowId,
      },
      { id: `link_${payload.workflowId}` },
    );
    return state;
  }

  // Success -> display results
  @Transition({ from: 'calendar_fetched', to: 'end' })
  async displayResults(state: CalendarState): Promise<unknown> {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/summary.md', { events: state.events }),
    });
    return {};
  }
}
```

## Using Tokens in Custom Tools

```typescript
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
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

  protected async handle(args: { calendarId: string }, ctx: LoopstackContext): Promise<ToolResult> {
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

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenSet } from '@loopstack/oauth-module';

@Injectable()
export class MyOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  readonly providerId = 'my-provider';
  readonly defaultScopes = ['read', 'write'];

  constructor(private registry: OAuthProviderRegistry) {}

  onModuleInit() {
    this.registry.register(this);
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.MY_CLIENT_ID!,
      redirect_uri: process.env.MY_REDIRECT_URI!,
      scope: scopes.join(' '),
      state,
      response_type: 'code',
    });
    return `https://my-provider.com/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    // POST to token endpoint
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    // POST to refresh endpoint
  }
}
```

## Environment Variables

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=...
```

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
