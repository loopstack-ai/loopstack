# @loopstack/google-workspace-module

> Google Workspace integration for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a Google OAuth 2.0 provider and tools for Google Workspace services. It registers a Google OAuth provider with `@loopstack/oauth-module`, enabling Google authentication in any Loopstack workflow, and provides tools for interacting with Google Workspace APIs such as Calendar, Drive, and Gmail.

## Overview

The Google Workspace Module includes a **provider implementation** for `@loopstack/oauth-module`. It implements the `OAuthProviderInterface` and self-registers with the `OAuthProviderRegistry` on startup. Once registered, the generic OAuth workflow can handle `provider: 'google'` automatically.

By using this module, you'll be able to:

- Authenticate users with their Google account via OAuth 2.0
- Request access to Google Workspace APIs (Calendar, Gmail, Drive, etc.) with configurable scopes
- Automatically refresh expired Google access tokens using refresh tokens

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

This module requires `@loopstack/oauth-module` as a peer dependency.

## How It Works

### Provider Registration

The `GoogleWorkspaceOAuthProvider` implements `OnModuleInit` and registers itself with the `OAuthProviderRegistry` at startup:

```typescript
onModuleInit(): void {
  this.providerRegistry.register(this);
}
```

After registration, the generic `OAuthWorkflow` from `@loopstack/oauth-module` can handle authentication for `provider: 'google'`.

### Provider Details

| Property        | Value                                          |
| --------------- | ---------------------------------------------- |
| `providerId`    | `'google'`                                     |
| `defaultScopes` | `userinfo.email`, `userinfo.profile`           |
| Auth endpoint   | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token endpoint  | `https://oauth2.googleapis.com/token`          |
| Access type     | `offline` (requests refresh tokens)            |

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
