---
'@loopstack/loopstack-studio': minor
---

The config and dashboard slices run on `@loopstack/client`/`@loopstack/react`: `useConfig`/`useTools`/`useDashboard` re-export the SDK hooks, the axios `api/config.ts` and `api/dashboard.ts` modules are removed, and app-config types come from `@loopstack/contracts/api`. Dead `meta.hidden` reads removed (no producer sets it — hiding works via the `internal` document flag).
