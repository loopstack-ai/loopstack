---
'@loopstack/react': minor
---

Auth hooks: `useMe` (no retries by default so 401s surface fast), `useWorkerHealth`, plus `useHubLogin`, `useRefreshSession`, and `useLogout` mutations that keep the me/health caches fresh.
