---
'@loopstack/oauth-module': minor
---

Public OAuth callback endpoints complete the authorization-code flow from `code` + `state` alone — no Studio popup required. `OAuthSessionService` registers each pending flow by its single-use state token (Redis-backed, in-memory fallback, 10 minute TTL) when the auth URL is built; `GET /api/v1/oauth/callback` (a provider redirect target — set `*_OAUTH_REDIRECT_URI=<api>/api/v1/oauth/callback`) and `POST /api/v1/oauth/complete` (used by Studio's callback page when opened without a popup opener) resolve the pending workflow and fire `exchangeToken` server-side as the user who started the flow. CLI-printed auth URLs and headless deployments now work end to end; the classic Studio popup flow is unchanged.
