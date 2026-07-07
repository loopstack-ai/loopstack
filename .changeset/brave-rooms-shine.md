---
'@loopstack/loopstack-studio': patch
---

Fix Studio crashing on load: `LoopstackClientProvider` called `useMe()` outside the `LoopstackProvider` it mounts — the auth gate for the live-event binding now renders inside the provider. `RouteErrorPage` no longer depends on Studio context (it renders outside the provider tree), so routing errors show the actual error instead of crashing the error page.
