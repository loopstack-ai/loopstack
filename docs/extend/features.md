---
title: Studio Features
description: How Loopstack features (Git, File Explorer, Secrets, etc.) are registered, discovered, and surfaced in Studio. Covers the registerFeature() helper, forFeature() module pattern, and the backend → frontend feature flow.
---

# Studio Features

A **feature** in Loopstack is an optional capability that a module opts into and that the Studio UI can render a dedicated surface for — typically a sidebar panel or a document widget. Built-in examples are the `git`, `fileExplorer`, and `secrets` features. Features are an advanced extension point: most apps never need to create one.

## When to Use a Feature

Use a feature when a module wants Studio to:

- show an extra UI panel (e.g. a Git history panel) only when the app opts in
- expose runtime config to the frontend (e.g. which environments a panel applies to)

If you only need workflows, tools, and documents, you don't need a feature — those are surfaced automatically.

## How It Works

1. A feature module exposes a `forFeature(config)` static method that registers a tagged provider via `registerFeature(id, config)`.
2. At bootstrap, the framework walks the import graph of each `@StudioApp` module and collects every registered feature reachable from it.
3. The Studio API returns the active features per app. The frontend has an `AVAILABLE_FEATURES` registry that maps each feature `id` to a UI surface (panel, widget, etc.).

The feature `id` on the backend must match the key in the frontend's `AVAILABLE_FEATURES` registry.

## Example — Enabling the Git Feature

```typescript
import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { GitModule } from '@loopstack/git-module';
import { MyWorkflow } from './workflows/my.workflow';

@StudioApp({
  title: 'My App',
  workflows: [MyWorkflow],
})
@Module({
  imports: [GitModule.forFeature({ enabled: true })],
  providers: [MyWorkflow],
})
export class MyAppModule {}
```

Importing `GitModule` alone provides the Git tools. Calling `GitModule.forFeature(...)` additionally registers the `git` feature for this app, which makes Studio render the Git sidebar panel.

## Defining a Custom Feature

A custom feature module uses `registerFeature()` inside `forFeature()`:

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { registerFeature } from '@loopstack/common';

@Module({
  /* providers, controllers… */
})
export class MyFeatureModule {
  static forFeature(config?: { enabled?: boolean } & Record<string, unknown>): DynamicModule {
    return {
      module: MyFeatureModule,
      providers: [registerFeature('myFeature', config)],
    };
  }
}
```

To make the feature visible in Studio, the frontend must register a matching entry in its `AVAILABLE_FEATURES` registry under the same `id` (`myFeature` here). Without that frontend entry the feature is registered on the backend but has no UI surface.

## Studio Extensions (advanced)

Some feature modules also contribute arbitrary config sections to a `@StudioApp` via `registerStudioExtension(section, data)`. The collected payloads are grouped by `section` and exposed on the resolved `StudioAppConfig.extensions[section]`. This is an internal extension point (currently used by `RemoteClientModule` to register environment slots) and not a stable public API — refer to the JSDoc on `registerStudioExtension` for details before using it.

## References

- `loopstack/packages/common/src/utils/feature-registration.ts` — `registerFeature()` helper
- `loopstack/packages/core/src/workflow-processor/services/studio-discovery.service.ts` — bootstrap-time feature discovery
- `loopstack/registry/features/git-module/src/git.module.ts` — reference implementation
