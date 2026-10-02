---
'@loopstack/oauth-module': patch
'@loopstack/google-workspace-module': patch
---

OAuth tokens stay valid with providers that rotate refresh tokens or omit `expires_in`.

- `@loopstack/oauth-module`: when `OAuthTokenStore` refreshes a token, it stores the refresh token and scope the
  provider returned, falling back to the stored ones when the response omits them.
- `@loopstack/oauth-module`: `OAuthTokenSet.expiresIn` and `StoredTokens.expiresAt` are optional. A token set without
  `expiresIn` is stored without an expiry, treated as valid until the provider rejects it, and kept in Redis for 30
  days.
- `@loopstack/google-workspace-module`: `GoogleWorkspaceOAuthProvider.refreshToken()` returns the `refresh_token` from
  Google's refresh response.
