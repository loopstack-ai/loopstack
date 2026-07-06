---
'@loopstack/loopstack-studio': minor
---

The secrets slice runs on the SDK transport: `useSecrets` uses `client.http` with the SDK's `queryKeys.secrets`, and every mutation applies its response to the cached list immediately (create/upsert insert sorted, update replaces, delete removes) — the UI is correct the instant a write returns, with SSE invalidation as the cross-tab path. The axios `api/secrets.ts` module is removed.
