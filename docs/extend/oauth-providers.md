---
title: Creating Custom OAuth Providers
description: Implementing a new OAuth provider with OAuthProviderInterface (buildAuthUrl, exchangeCode, refreshToken) and registering it with OAuthProviderRegistry, shown on MockOAuthProvider from the runnable OAuth example. Covers required methods, OAuthTokenSet, module setup, running OAuthWorkflow and reading the token with OAuthTokenStore.getValidAccessToken().
---

# Creating OAuth Providers

Add a new OAuth provider to Loopstack by implementing `OAuthProviderInterface` and registering it with the `OAuthProviderRegistry`. The code on this page is from the [OAuth example](/docs/examples/oauth), which you can run without an account: its provider, `MockOAuthProvider`, signs in to a mock authorization server inside the examples app.

## The Interface

`MockOAuthProvider` makes the standard OAuth 2.0 requests. Its client credentials and URLs come from `mock-provider.config.ts`; a provider for a real service reads its own from the configuration, for example with `ConfigService`.

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenSet } from '@loopstack/oauth';
import { MOCK_CLIENT_ID, MOCK_CLIENT_SECRET, mockServerUrl, oauthCallbackUrl } from './mock-provider.config';

/** The token endpoint's response, in the OAuth 2.0 format. */
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class MockOAuthProvider implements OAuthProviderInterface, OnModuleInit {
  readonly providerId = 'mock';
  readonly defaultScopes = ['profile'];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
  ) {}

  onModuleInit(): void {
    this.providerRegistry.register(this);
  }

  buildAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MOCK_CLIENT_ID,
      redirect_uri: oauthCallbackUrl(this.configService),
      scope: scopes.join(' '),
      state,
    });
    return `${mockServerUrl(this.configService)}/authorize?${params.toString()}`;
  }

  exchangeCode(code: string): Promise<OAuthTokenSet> {
    return this.requestTokens({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthCallbackUrl(this.configService),
    });
  }

  refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    return this.requestTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async requestTokens(grant: Record<string, string>): Promise<OAuthTokenSet> {
    const response = await fetch(`${mockServerUrl(this.configService)}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ ...grant, client_id: MOCK_CLIENT_ID, client_secret: MOCK_CLIENT_SECRET }),
    });
    const tokens = (await response.json()) as TokenResponse;

    if (!response.ok || !tokens.access_token) {
      throw new Error(`Mock token request failed: ${tokens.error_description ?? tokens.error ?? response.statusText}`);
    }

    return {
      accessToken: tokens.access_token,
      // Present after a code exchange; a refresh returns none, and the token store keeps the old one.
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope ?? '',
    };
  }
}
```

## Method Responsibilities

| Method         | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `buildAuthUrl` | Construct the OAuth authorization URL for the user to visit |
| `exchangeCode` | Exchange the authorization code for tokens after redirect   |
| `refreshToken` | Refresh an expired access token using the refresh token     |

## `OAuthTokenSet`

The return type for `exchangeCode` and `refreshToken`:

```typescript
interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds until expiry; omit when the provider reports none (never expires)
  scope: string;
}
```

When `refreshToken` returns no `refreshToken`, `OAuthTokenStore` keeps the one it has stored.

## Registration

The provider self-registers via `OnModuleInit`. Once registered, it's available to the built-in `OAuthWorkflow` and `OAuthTokenStore`.

## Create the Module

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth';
import { MockApiClient } from './mock-api.client';
import { MockAuthorizationServerController } from './mock-authorization-server.controller';
import { MockOAuthProvider } from './mock-oauth.provider';

@Module({
  imports: [OAuthModule],
  controllers: [MockAuthorizationServerController],
  providers: [MockOAuthProvider, MockApiClient],
  exports: [MockOAuthProvider, MockApiClient],
})
export class MockProviderModule {}
```

The controller is the example's mock authorization server, and `MockApiClient` calls its protected API. A module for a real service has no controller.

## Usage

Users import your module — no other changes needed:

```typescript
@Module({
  imports: [LoopstackModule.forRoot(), MockProviderModule],
})
export class AppModule {}
```

Then read the token in a workflow, and run `OAuthWorkflow` for your provider when there is none:

```typescript
const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'mock');
const profile = accessToken ? await this.mockApi.getProfile(accessToken) : undefined;
this.assignState({ requiresAuthentication: !profile, profile });
```

```typescript
await this.oAuthWorkflow.run(
  { provider: 'mock', scopes: ['profile'] },
  {
    onSuccess: { transition: 'authCompleted' },
    onFailure: { transition: 'authFailed' },
    show: 'inline',
    label: 'Mock provider sign-in required',
  },
);
```

The [OAuth example](/docs/examples/oauth#custom-provider) shows the whole workflow: `authCompleted` starts it over, so it reads the new token and calls the API.

## Token Lifecycle

1. `OAuthWorkflow` calls `buildAuthUrl()` and shows the URL to the user
2. User completes OAuth in browser, gets redirected back with a code
3. Framework calls `exchangeCode()` to get tokens
4. Tokens are stored per user per provider via `OAuthTokenStore`
5. `OAuthTokenStore.getValidAccessToken()` calls `refreshToken()` when the access token expires within a minute
6. Tools check for valid tokens and return `{ error: 'unauthorized' }` if missing

## Existing Providers

| Provider | Module                        | Provider ID |
| -------- | ----------------------------- | ----------- |
| Google   | `@loopstack/google-workspace` | `'google'`  |
| GitHub   | `@loopstack/github`           | `'github'`  |
