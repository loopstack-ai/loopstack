# @loopstack/google-oauth-module

> Google OAuth 2.0 provider for the [Loopstack AI](https://loopstack.ai) automation framework.

This module registers a Google OAuth provider with `@loopstack/oauth-module`, enabling Google authentication in any Loopstack workflow. It handles authorization URL generation, authorization code exchange, and token refresh using Google's OAuth 2.0 endpoints.

## Overview

The Google OAuth Module is a **provider implementation** for `@loopstack/oauth-module`. It implements the `OAuthProviderInterface` and self-registers with the `OAuthProviderRegistry` on startup. Once registered, the generic OAuth workflow can handle `provider: 'google'` automatically.

By using this module, you'll be able to:

- Authenticate users with their Google account via OAuth 2.0
- Request access to Google APIs (Calendar, Gmail, Drive, etc.) with configurable scopes
- Automatically refresh expired Google access tokens using refresh tokens

## Installation

```bash
npm install --save @loopstack/google-oauth-module
```

This module requires `@loopstack/oauth-module` as a peer dependency.

## Setup

### 1. Configure Environment Variables

| Variable                    | Required | Default           | Description                     |
| --------------------------- | -------- | ----------------- | ------------------------------- |
| `GOOGLE_CLIENT_ID`         | Yes      | —                 | Your Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET`     | Yes      | —                 | Your Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI`| No       | `/oauth/callback` | The OAuth redirect URI          |

You can obtain client credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### 2. Import the Module

Add `GoogleOAuthModule` alongside `OAuthModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GoogleOAuthModule } from '@loopstack/google-oauth-module';

@Module({
  imports: [OAuthModule, GoogleOAuthModule],
})
export class AppModule {}
```

The `GoogleOAuthProvider` automatically registers itself with the `OAuthProviderRegistry` on module initialization.

## How It Works

### Provider Registration

The `GoogleOAuthProvider` implements `OnModuleInit` and registers itself with the `OAuthProviderRegistry` at startup:

```typescript
onModuleInit(): void {
  this.providerRegistry.register(this);
}
```

After registration, the generic `OAuthWorkflow` from `@loopstack/oauth-module` can handle authentication for `provider: 'google'`.

### Provider Details

| Property        | Value                                                     |
| --------------- | --------------------------------------------------------- |
| `providerId`    | `'google'`                                                |
| `defaultScopes` | `userinfo.email`, `userinfo.profile`                     |
| Auth endpoint   | `https://accounts.google.com/o/oauth2/v2/auth`           |
| Token endpoint  | `https://oauth2.googleapis.com/token`                     |
| Access type     | `offline` (requests refresh tokens)                       |

### Supported Operations

- **`buildAuthUrl(scopes, state)`** — Builds a Google OAuth authorization URL with the given scopes and CSRF state parameter. Requests `access_type: offline` and `prompt: consent` to ensure a refresh token is returned.
- **`exchangeCode(code)`** — Exchanges an authorization code for access and refresh tokens via Google's token endpoint.
- **`refreshToken(refreshToken)`** — Refreshes an expired access token using a stored refresh token.

## Usage in Workflows

Once registered, any workflow can trigger Google authentication by launching the OAuth workflow with `provider: 'google'`:

```yaml
- tool: executeWorkflowAsync
  args:
    workflow: oAuthWorkflow
    args:
      provider: 'google'
      scopes:
        - 'https://www.googleapis.com/auth/calendar.readonly'
    callback:
      transition: auth_completed
```

See `@loopstack/oauth-module` and `@loopstack/google-oauth-calendar-example` for complete usage examples.

## Dependencies

- `@loopstack/oauth-module` — Provides `OAuthProviderRegistry`, `OAuthProviderInterface`, and `OAuthTokenSet`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples see the [Loopstack Registry](https://loopstack.ai/registry)
