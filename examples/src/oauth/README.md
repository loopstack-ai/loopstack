---
title: OAuth Examples
description: Runnable Loopstack example of a custom OAuth provider — MockOAuthProvider implements OAuthProviderInterface (buildAuthUrl, exchangeCode, refreshToken) and registers with OAuthProviderRegistry, the workflow runs OAuthWorkflow as a sub-workflow and calls an API with the token from OAuthTokenStore.getValidAccessToken(), against a mock authorization server in the app
---

# OAuth Examples

> OAuth examples for the [Loopstack](https://loopstack.ai) automation framework.

`@loopstack/oauth` runs the OAuth 2.0 authorization code flow for any provider that implements `OAuthProviderInterface`. This module shows that framework with a provider written in the app: `MockOAuthProvider` signs in to a mock authorization server that runs inside the same app, so the example needs no account and no client credentials. Start from it when you connect a service that has no Loopstack module yet. [Creating OAuth Providers](/docs/extend/oauth-providers) explains each part of the provider.

For the providers Loopstack ships, see the [GitHub](/docs/examples/github) and [Google Workspace](/docs/examples/google-workspace) examples.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/oauth
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { OAuthExamplesModule } from './oauth/oauth-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), OAuthExamplesModule],
})
export class AppModule {}
```

## Environment

The example needs no variables. The mock server and the OAuth callback use the app's own base URL, `http://localhost:${PORT}` (`PORT` defaults to `3000`), so open the authorization URL in a browser on the machine that runs the app.

Tokens are stored in Redis when `REDIS_HOST` points to one, and in memory otherwise.

## Examples

| Example                             | Studio title                      | Description                                                        |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| [Custom Provider](#custom-provider) | `OAuth - Custom Provider Example` | Signs in through a custom provider and calls an API with its token |

---

## Custom Provider

`CustomOAuthProviderExampleWorkflow` reads the user's token for the `mock` provider. When there is none, it runs `OAuthWorkflow`, and after the sign-in it calls the mock server's protected API with the token.

### What it demonstrates

- Implementing `OAuthProviderInterface`: `buildAuthUrl` builds the authorization URL, `exchangeCode` and `refreshToken` make the standard OAuth 2.0 token requests
- Registering the provider with `OAuthProviderRegistry` in `onModuleInit`, so importing `MockProviderModule` is all an app needs
- Running `OAuthWorkflow` as a sub-workflow with `{ provider: 'mock' }`, and naming both outcomes at the call site
- Reading the token with `OAuthTokenStore.getValidAccessToken(userId, 'mock')`, which refreshes an expired token through the provider's `refreshToken`
- Signing in again when the API rejects the stored token

### Key code

```ts
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
  // buildAuthUrl, exchangeCode, refreshToken
}
```

```ts
const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'mock');
const profile = accessToken ? await this.mockApi.getProfile(accessToken) : undefined;
this.assignState({ requiresAuthentication: !profile, profile });
```

```ts
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

### How to run it

1. Start the workflow from the OAuth Examples app in Studio. With no token stored, it waits at `awaiting_auth` and shows the sign-in prompt of `OAuthWorkflow`.
2. Click **Sign in with Mock**. The popup opens the mock server's consent page; click **Allow**.
3. The mock server redirects to `/api/v1/oauth/callback`, which exchanges the code through `MockOAuthProvider.exchangeCode` and stores the tokens.
4. The workflow starts over, reads the token, and completes with the profile from the API: `{ profile: { id: 'mock-user-1', name: 'Ada Lovelace', email: 'ada@example.com' } }`.

A second run uses the stored token and completes without a sign-in. The mock server keeps its tokens in memory, so after an app restart it rejects a token that is still stored in Redis, and the workflow asks for a sign-in again.

### Files

- `custom-oauth-provider-example.workflow.ts` — workflow class
- `mock-provider/mock-oauth.provider.ts` — `MockOAuthProvider`, the provider
- `mock-provider/mock-api.client.ts` — `MockApiClient`, which calls the protected API with an access token
- `mock-provider/mock-authorization-server.controller.ts` — the mock authorization server: consent page, token endpoint and protected API
- `mock-provider/mock-provider.config.ts` — the mock client's credentials and the URLs
- `mock-provider/mock-provider.module.ts` — `MockProviderModule`, the module an app imports

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
