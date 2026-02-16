# @loopstack/oauth-module

> A provider-agnostic OAuth 2.0 module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a generic OAuth workflow, token storage, and a provider registry. It handles the full OAuth 2.0 authorization code flow — any provider (Google, Microsoft, GitHub, etc.) can be plugged in by implementing a single interface.

## Overview

The OAuth Module is the **infrastructure layer** for authentication. It does not contain any provider-specific code. Instead, provider modules (e.g. a Google OAuth module) register themselves at startup and the generic workflow delegates to them.

By using this module, you'll be able to:

- Run an OAuth 2.0 authorization code flow for any registered provider
- Store and retrieve access/refresh tokens per user and provider
- Automatically refresh expired tokens
- Display provider-agnostic auth prompts and auth-required documents in Loopstack Studio
- Trigger authentication from any workflow via the auth-required pattern

## Installation

```bash
npm install --save @loopstack/oauth-module
```

Then add `OAuthModule` to the imports of your application module:

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';

@Module({
  imports: [OAuthModule],
})
export class AppModule {}
```

## Architecture

```
oauth-module (generic)          provider module (e.g. google)
┌─────────────────────────┐     ┌──────────────────────────┐
│ OAuthProviderRegistry   │◄────│ GoogleOAuthProvider       │
│ OAuthTokenStore         │     │ (implements interface,    │
│ BuildOAuthUrlTool       │     │  registers on init)       │
│ ExchangeOAuthTokenTool  │     └──────────────────────────┘
│ OAuthWorkflow           │
│ OAuthPromptDocument     │     consumer workflow
│ AuthRequiredDocument    │     ┌──────────────────────────┐
└─────────────────────────┘     │ uses OAuthTokenStore     │
                                │ creates AuthRequired doc │
                                │ to trigger auth flow     │
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
  readonly providerId: string;       // Unique identifier, e.g. 'google', 'github'
  readonly defaultScopes: string[];  // Fallback scopes when none are specified

  buildAuthUrl(scopes: string[], state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
}

interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;    // Seconds until expiry
  scope: string;
}
```

## Using the OAuth Workflow in a Custom Use Case

The typical pattern is "try, then authenticate on failure":

1. Your tool attempts an API call using a token from `OAuthTokenStore`
2. If no token exists (or it's rejected), your workflow creates an `AuthRequiredDocument`
3. The frontend renders the auth-required UI, launches the generic OAuth workflow, and auto-retries after success

### Step 1: Inject `OAuthTokenStore` in your tool

```typescript
import { Inject } from '@nestjs/common';
import { Tool, ToolInterface, ToolResult, RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

@Tool({ config: { description: 'Fetches data from an API that requires OAuth.' } })
export class MyApiTool implements ToolInterface {
  @Inject() private tokenStore: OAuthTokenStore;

  async execute(args: any, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return { data: { error: 'unauthorized' } };
    }

    const response = await fetch('https://api.example.com/data', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // ... handle response
    return { data: { items: await response.json() } };
  }
}
```

### Step 2: Handle the auth-required flow in your workflow YAML

```yaml
transitions:
  # 1. Attempt the API call
  - id: fetch_data
    from: start
    to: data_fetched
    call:
      - tool: myApiTool
        assign:
          requiresAuth: ${{ result.data.error == "unauthorized" }}
          items: ${{ result.data.items }}

  # 2. If unauthorized, show auth-required prompt
  - id: auth_required
    from: data_fetched
    to: awaiting_retry
    if: ${{ state.requiresAuth }}
    call:
      - tool: createDocument
        args:
          id: authStatus
          document: authRequiredDocument
          update:
            content:
              provider: github
              message: 'Authentication required. Please sign in and click Retry.'
              workflowName: oauth     # References the generic OAuth workflow
              workspaceId: ${{ context.workspaceId }}
              scopes:
                - 'repo'

  # 3. Retry after authentication completes
  - id: retry
    from: awaiting_retry
    to: start
    trigger: manual
    call:
      - tool: createDocument
        args:
          id: authStatus
          document: linkDocument
          update:
            content:
              icon: 'ShieldCheck'
              type: 'success'
              label: 'Authentication completed'

  # 4. Success path
  - id: display_results
    from: data_fetched
    to: end
    call:
      - tool: createChatMessage
        args:
          role: assistant
          content: 'Here is your data: ...'
```

### Step 3: Wire up the workflow class

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDocument, InjectTool, Context, Runtime, State, Workflow, WorkflowInterface } from '@loopstack/common';
import { CreateDocument, LinkDocument } from '@loopstack/core-ui-module';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { AuthRequiredDocument } from '@loopstack/oauth-module';
import { MyApiTool } from './my-api.tool';

@Workflow({ configFile: __dirname + '/my.workflow.yaml' })
export class MyWorkflow implements WorkflowInterface {
  @InjectTool() private myApiTool: MyApiTool;
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectDocument() private authRequiredDocument: AuthRequiredDocument;
  @InjectDocument() private linkDocument: LinkDocument;

  @Context() context: any;
  @Runtime() runtime: any;
  @State({ schema: z.object({ requiresAuth: z.boolean().optional(), items: z.any().optional() }).strict() })
  state: { requiresAuth?: boolean; items?: any };
}
```

### Key fields in `AuthRequiredDocument`

| Field          | Type       | Description                                                      |
| -------------- | ---------- | ---------------------------------------------------------------- |
| `provider`     | `string`   | Provider ID matching a registered `OAuthProviderInterface`       |
| `message`      | `string`   | Human-readable message shown to the user                         |
| `workflowName` | `string`   | Name of the OAuth workflow in the workspace (typically `'oauth'`) |
| `workspaceId`  | `string`   | Current workspace ID, use `${{ context.workspaceId }}`           |
| `scopes`       | `string[]` | OAuth scopes to request (optional, falls back to provider defaults) |

## Service Reference

### OAuthProviderRegistry

Manages registered OAuth providers.

| Method                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `register(provider)`   | Register a provider instance             |
| `get(providerId)`      | Get a provider by ID (throws if missing) |
| `has(providerId)`      | Check if a provider is registered        |

### OAuthTokenStore

Stores and retrieves OAuth tokens per user and provider. Currently uses an in-memory store.

| Method                                         | Description                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `storeTokens(userId, providerId, tokens)`     | Store tokens for a user/provider pair                                  |
| `storeFromTokenSet(userId, providerId, set)`  | Store tokens from an `OAuthTokenSet` (auto-calculates expiry)         |
| `getTokens(userId, providerId)`               | Get stored tokens (may be expired)                                     |
| `getValidAccessToken(userId, providerId)`     | Get a valid access token, auto-refreshing if expired and possible      |

## Document Types

### OAuthPromptDocument

Rendered by the `oauth-prompt` widget. Used internally by the OAuth workflow to show the sign-in prompt.

| Field      | Type     | Description                        |
| ---------- | -------- | ---------------------------------- |
| `provider` | `string` | Provider ID                        |
| `authUrl`  | `string` | The OAuth authorization URL        |
| `state`    | `string` | CSRF state parameter               |
| `status`   | `string` | `'pending'`, `'success'`, `'error'` |
| `message`  | `string` | Optional status message            |

### AuthRequiredDocument

Rendered by the `auth-required` widget. Used by consumer workflows to trigger the OAuth flow.

| Field          | Type       | Description                              |
| -------------- | ---------- | ---------------------------------------- |
| `provider`     | `string`   | Provider ID                              |
| `message`      | `string`   | Message shown to the user                |
| `workflowName` | `string`   | OAuth workflow name in the workspace     |
| `workspaceId`  | `string`   | Current workspace ID                     |
| `scopes`       | `string[]` | OAuth scopes to request (optional)       |

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this module look for `@loopstack/oauth-module` in the [Loopstack Registry](https://loopstack.ai/registry)
