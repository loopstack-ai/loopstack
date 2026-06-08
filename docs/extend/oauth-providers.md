---
title: Creating Custom OAuth Providers
description: Implementing a new OAuth provider by extending OAuthProviderInterface and registering with OAuthProviderRegistry. Covers required methods, token handling, and module setup.
---

# Creating OAuth Providers

Add a new OAuth provider to Loopstack by implementing `OAuthProviderInterface` and registering it with the `OAuthProviderRegistry`.

## The Interface

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
    // POST to token endpoint, return { accessToken, refreshToken, expiresIn, scope }
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    // POST to refresh endpoint, return new token set
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
  expiresIn: number; // seconds until expiry
  scope: string;
}
```

## Registration

The provider self-registers via `OnModuleInit`. Once registered, it's available to the built-in `OAuthWorkflow` and `OAuthTokenStore`.

## Create the Module

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { MyOAuthProvider } from './my-oauth-provider';

@Module({
  imports: [OAuthModule],
  providers: [MyOAuthProvider],
  exports: [MyOAuthProvider],
})
export class MyOAuthModule {}
```

## Usage

Users import your module — no other changes needed:

```typescript
@Module({
  imports: [LoopstackModule.forRoot(), MyOAuthModule],
})
export class AppModule {}
```

Then use it in workflows:

```typescript
await this.oAuth.run(
  { provider: 'my-provider', scopes: ['read', 'write'] },
  { callback: { transition: 'authCompleted' } },
);
```

## Token Lifecycle

1. `OAuthWorkflow` calls `buildAuthUrl()` and shows the URL to the user
2. User completes OAuth in browser, gets redirected back with a code
3. Framework calls `exchangeCode()` to get tokens
4. Tokens are stored per user per provider via `OAuthTokenStore`
5. `OAuthTokenStore.getValidAccessToken()` auto-calls `refreshToken()` when expired
6. Tools check for valid tokens and return `{ error: 'unauthorized' }` if missing

## Existing Providers

| Provider | Module                               | Provider ID |
| -------- | ------------------------------------ | ----------- |
| Google   | `@loopstack/google-workspace-module` | `'google'`  |
| GitHub   | `@loopstack/github-module`           | `'github'`  |
