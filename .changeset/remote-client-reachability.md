---
'@loopstack/remote-client': minor
---

Add `RemoteClient.ping(connectionUrl)` (calls `GET /health`) and `EnvironmentService.assertReachable(slotId?)`, a pre-flight check that resolves the agent URL and verifies the remote agent responds. Throws a user-readable error with the slot name and underlying cause when the slot has no environment connected or the agent does not answer. Use at the start of workflows that depend on remote-client tools (grep, glob, read, bash, …) to fail fast with actionable messages instead of cryptic network errors mid-run.

`EnvironmentService`'s "no environment with agent URL found" error now names the slot ("slot \"sandbox\"" vs. "any slot") and tells the user to connect an environment in their app.

`EnvironmentConfigService` logs the resolved available environment types and slot ids at bootstrap so misconfigurations are visible without enabling debug logging.

Internally, `RemoteClientModule.forFeature()` now returns a separate `RemoteClientFeatureModule` host instead of `RemoteClientModule` itself. The previous form transitively re-imported the `@Global` root and would shadow the `forRoot()` config with defaults whenever a feature module was loaded. No public-API impact.
