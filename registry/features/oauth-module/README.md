# @loopstack/oauth-module

> A provider-agnostic OAuth 2.0 module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a generic OAuth workflow, token storage, and a provider registry. It handles the full OAuth 2.0 authorization code flow — any provider (Google, Microsoft, GitHub, etc.) can be plugged in by implementing a single interface.

## Overview

The OAuth Module is the **infrastructure layer** for authentication. It does not contain any provider-specific code. Instead, provider modules (e.g. a Google OAuth module) register themselves at startup and the generic workflow delegates to them.

By using this module, you'll be able to:

- Run an OAuth 2.0 authorization code flow for any registered provider
- Store and retrieve access/refresh tokens per user and provider
- Automatically refresh expired tokens
- Trigger authentication from any workflow via the sub-workflow pattern

## Installation and Setup

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## Architecture

```
oauth-module (generic)          provider module (e.g. google)
┌─────────────────────────┐     ┌──────────────────────────┐
│ OAuthProviderRegistry   │◄────│ GoogleWorkspaceOAuthProvider │
│ OAuthTokenStore         │     │ (implements interface,    │
│ BuildOAuthUrlTool       │     │  registers on init)       │
│ ExchangeOAuthTokenTool  │     └──────────────────────────┘
│ OAuthWorkflow           │
│ OAuthPromptDocument     │     consumer workflow
└─────────────────────────┘     ┌──────────────────────────┐
                                │ uses OAuthTokenStore     │
                                │ launches OAuthWorkflow   │
                                │ via InjectWorkflow       │
                                └──────────────────────────┘
```

## Implementing a Custom OAuth Provider

To add support for a new OAuth provider, implement the `OAuthProviderInterface` and register it with the `OAuthProviderRegistry`.

### 1. Create the provider

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OAuthProviderInterface, OAuthTokenSet } from '@loopstack/oauth-module';
import { OAuthProviderRegistry } from '@loopstack/oauth-module';

@Injectable()
export class GitHubOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  private readonly logger = new Logger(GitHubOAuthProvider.name);

  readonly providerId = 'github';
  readonly defaultScopes = ['read:user', 'user:email'];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
    this.logger.log('GitHub OAuth provider registered');
  }

  private get clientId(): string {
    const id = this.configService.get<string>('GITHUB_CLIENT_ID');
    if (!id) throw new Error('GITHUB_CLIENT_ID is not configured');
    return id;
  }

  private get clientSecret(): string {
    const secret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    if (!secret) throw new Error('GITHUB_CLIENT_SECRET is not configured');
    return secret;
  }

  private get redirectUri(): string {
    return this.configService.get<string>('GITHUB_OAUTH_REDIRECT_URI', '/oauth/callback');
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) throw new Error(`GitHub token exchange failed: ${response.statusText}`);

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope: string;
    };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in ?? 28800,
      scope: tokens.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    // Implement provider-specific refresh logic, or throw if not supported
    throw new Error('GitHub classic tokens do not support refresh.');
  }
}
```

### 2. Create a NestJS module for the provider

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GitHubOAuthProvider } from './github-oauth.provider';

@Module({
  imports: [OAuthModule],
  providers: [GitHubOAuthProvider],
  exports: [GitHubOAuthProvider],
})
export class GitHubOAuthModule {}
```

### 3. Register in your application

```typescript
@Module({
  imports: [OAuthModule, GitHubOAuthModule],
})
export class AppModule {}
```

That's it. The generic OAuth workflow will now handle `provider: 'github'` automatically.

## Provider Interface Reference

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

## Using the OAuth Workflow in a Custom Use Case

The typical pattern is "try, then authenticate on failure" using `@InjectWorkflow()` to launch the OAuth workflow as a sub-workflow:

1. Your tool attempts an API call using a token from `OAuthTokenStore`
2. If no token exists (or it's rejected), your workflow launches the OAuth workflow as a sub-workflow
3. The OAuth sub-workflow handles the full auth flow (popup, code exchange, token storage)
4. On completion, the parent workflow is automatically resumed via the callback transition

### Step 1: Create a tool that uses `OAuthTokenStore`

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    query: z.string(),
  })
  .strict();

@Injectable()
@Tool({
  uiConfig: { description: 'Fetches data from an API that requires OAuth.' },
  schema: inputSchema,
})
export class MyApiTool extends BaseTool {
  private readonly logger = new Logger(MyApiTool.name);

  @Inject() private tokenStore: OAuthTokenStore;

  async call(args: z.infer<typeof inputSchema>): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return { data: { error: 'unauthorized' } };
    }

    const response = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return { data: { items: await response.json() } };
  }
}
```

### Step 2: Handle the auth flow in your workflow

```typescript
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { LinkDocument } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { MyApiTool } from './my-api.tool';

@Workflow({
  uiConfig: __dirname + '/my.ui.yaml',
  schema: z
    .object({
      query: z.string().default('example'),
    })
    .strict(),
})
export class MyWorkflow extends BaseWorkflow<{ query: string }> {
  @InjectTool() private myApiTool: MyApiTool;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectWorkflow() private oAuth: OAuthWorkflow;

  requiresAuth?: boolean;
  items?: any;

  // 1. Attempt the API call
  @Initial({ to: 'data_fetched' })
  async fetchData(args: { query: string }) {
    const result: ToolResult = await this.myApiTool.call({ query: args.query });
    this.requiresAuth = result.data?.error === 'unauthorized';
    this.items = result.data?.items;
  }

  // 2. If unauthorized, launch OAuth as a sub-workflow
  @Transition({ from: 'data_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    const result = await this.oAuth.run(
      { provider: 'github', scopes: ['repo'] },
      { alias: 'oAuth', callback: { transition: 'authCompleted' } },
    );

    await this.repository.save(
      LinkDocument,
      {
        label: 'GitHub authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
  }

  needsAuth(): boolean {
    return !!this.requiresAuth;
  }

  // 3. Auth completed — retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
    schema: CallbackSchema,
  })
  async authCompleted(payload: { workflowId: string }) {
    await this.repository.save(
      LinkDocument,
      {
        status: 'success',
        label: 'Authentication completed',
        workflowId: payload.workflowId,
        embed: true,
        expanded: false,
      },
      { id: `link_${payload.workflowId}` },
    );
  }

  // 4. Success path
  @Final({ from: 'data_fetched' })
  async displayResults() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Here is your data: ${JSON.stringify(this.items)}`,
    });
  }
}
```

The `embed: true` and `expanded: true` flags on the link document cause the OAuth sub-workflow to render inline as an iframe, so the user can complete authentication without leaving the page. Omit these flags to show a plain link instead.

### Step 3: Wire up the module

Your module must import `LoopCoreModule` (for sub-workflow support) and the relevant provider module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { GitHubOAuthModule } from '../github-oauth-module';

@Module({
  imports: [LoopCoreModule, GitHubOAuthModule],
  providers: [MyApiTool, MyWorkflow],
})
export class MyModule {}
```

## Service Reference

### OAuthProviderRegistry

Manages registered OAuth providers.

| Method               | Description                              |
| -------------------- | ---------------------------------------- |
| `register(provider)` | Register a provider instance             |
| `get(providerId)`    | Get a provider by ID (throws if missing) |
| `has(providerId)`    | Check if a provider is registered        |

### OAuthTokenStore

Stores and retrieves OAuth tokens per user and provider. Currently uses an in-memory store.

| Method                                       | Description                                                       |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `storeTokens(userId, providerId, tokens)`    | Store tokens for a user/provider pair                             |
| `storeFromTokenSet(userId, providerId, set)` | Store tokens from an `OAuthTokenSet` (auto-calculates expiry)     |
| `getTokens(userId, providerId)`              | Get stored tokens (may be expired)                                |
| `getValidAccessToken(userId, providerId)`    | Get a valid access token, auto-refreshing if expired and possible |

## Document Types

### OAuthPromptDocument

Rendered by the `oauth-prompt` widget. Used internally by the OAuth workflow to show the sign-in prompt with a popup-based authentication flow.

| Field      | Type     | Description                         |
| ---------- | -------- | ----------------------------------- |
| `provider` | `string` | Provider ID                         |
| `authUrl`  | `string` | The OAuth authorization URL         |
| `state`    | `string` | CSRF state parameter                |
| `status`   | `string` | `'pending'`, `'success'`, `'error'` |
| `message`  | `string` | Optional status message             |

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this module look for `@loopstack/oauth-module` in the [Loopstack Registry](https://loopstack.ai/registry)
