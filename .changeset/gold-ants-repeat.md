---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/auth': minor
'@loopstack/api': minor
'@loopstack/client': minor
---

Auth moves to zod-first contracts and the SDK. `AuthUserSchema` gives `/auth/me` a real contract (id, isActive, roles, ISO dates); `WorkerInfoSchema`, `HubLoginRequestSchema`, `HubLoginResponseSchema`, and `AuthMessageSchema` cover the remaining endpoints. The auth controller validates the hub-login body with zod and the service maps responses with dev-time schema assertion; the wire DTOs are removed. `assertResponse` now lives in `@loopstack/common` so all server packages share one copy. The client gains an `auth` resource (me, workerHealth, hubLogin, refresh, logout) with `me`/`workerHealth` query descriptors.
