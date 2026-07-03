---
'@loopstack/auth': minor
'@loopstack/common': minor
'@loopstack/contracts': minor
'@loopstack/api': patch
---

Headless authentication: with auth disabled, credential-less requests now resolve to the local dev user (created lazily via `UserRepository.findOrCreateLocalUser`) — local CLIs and scripts need no login dance. Personal access tokens (`lsk_…`) provide credentials for real deployments: created via `POST /api/v1/auth/tokens` (plaintext shown once, sha256 hash stored), listed and revoked via the same endpoint, validated by the auth guard ahead of JWT verification with expiry and revocation checks. `ZodValidationPipe`/`ZodJsonQueryPipe` now live in `@loopstack/common` so any package can validate with contract schemas.
