---
'@loopstack/secrets-module': minor
---

Add module-scoped **global secret fallback**. `SecretsModule.forRoot(config)` / `forFeature(config)` now accept `globalSecretKeys` — key names allowed to fall back to a value from `process.env` when the current workspace has no secret of that key (a workspace secret of the same key always wins). Different modules can declare different allowlists (the config-bound `SecretService` / `get_secret_keys` are re-provided per registration, over a shared `@Global` root). `SecretService` gains `resolveEnvMap(workspaceId)` (the effective `key → value` env) and `resolveKeys(workspaceId)` (available keys, each flagged `global`); `get_secret_keys` now reports globally-available keys too (with a `global` flag), so required-secret checks treat them as present. Backward-compatible: with no `globalSecretKeys` configured, behavior is unchanged.
