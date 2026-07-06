---
'@loopstack/loopstack-studio': minor
---

The auth slice runs on `@loopstack/client`/`@loopstack/react`: `useAuth` re-exports the SDK hooks, the axios `api/auth.ts` module is removed, and `createApiClient` builds on `createClient` with the shared reporting fetch. Fix: LocalHealthCheck's refresh/login success paths now clear the escalation banner (the old `data.status === 200` checks never matched).
