---
title: API: @loopstack/remote-file-explorer-module
description: Public API reference for @loopstack/remote-file-explorer-module
includeInLlmsFullTxt: false
---

# API: @loopstack/remote-file-explorer-module

## Classes

### RemoteFileExplorerModule

NestJS module that provides REST endpoints for browsing the file tree and
reading file contents of a remote workspace (`RemoteFileExplorerController`),
proxying requests to the remote agent via `RemoteClient`.

Registration:

- `RemoteFileExplorerModule` — bare import. Enough when no feature-flag scoping
  is needed: the controller is wired up and the endpoints go live.
- `RemoteFileExplorerModule.forFeature(config?: { enabled?: boolean; environments?: string[] })`
  — use to register it as a Studio feature flag and optionally restrict it to
  specific environment names.

Requires: `RemoteClient` and `EnvironmentService` from `@loopstack/remote-client`
must be available in the DI container — import `RemoteClientModule` in a parent
module. The remote agent URL is resolved at runtime; no environment variables
are required by this module itself.

```ts
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
```

```ts
export class RemoteFileExplorerModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule;
}
```
