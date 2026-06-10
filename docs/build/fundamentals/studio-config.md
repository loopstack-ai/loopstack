---
title: Studio Configuration
description: Reference for the `ui` option on @StudioApp. Documents StudioUiConfig and the StudioWidgetConfig widget array used to customize an app's Studio surface.
---

# Studio Configuration

The `ui` option on `@StudioApp` controls how an app is rendered in Loopstack Studio. This page is the single reference for those options. More options will be added over time.

## `ui.widgets`

`widgets` is an array of widget descriptors. Each entry names a widget and may pass widget-specific options.

```typescript
@StudioApp({
  title: 'My App',
  workflows: [MyWorkflow],
  ui: {
    widgets: [{ widget: 'prompt-input', options: { placeholder: 'Ask anything…' } }],
  },
})
@Module({
  /* ... */
})
export class MyAppModule {}
```

Each entry has:

- **`widget`** — the widget identifier (e.g. `prompt-input`, `button`, `form`)
- **`options`** — optional, widget-specific configuration

The same widget format is used in document and workflow YAML configs under `ui.widgets[]`.

## Available Features

Some registry modules light up additional Studio surfaces when imported by your app — sidebars, panels, or richer document widgets. They register themselves at bootstrap and appear under `StudioAppConfig.features`, which Studio reads to decide what UI to expose. You don't have to wire anything up beyond importing the module.

| Feature        | Registered by                                                                     | What it adds to Studio                           |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `git`          | `@loopstack/git-module` (`GitModule.forFeature(config)`)                          | Git status panel and version-control affordances |
| `fileExplorer` | `@loopstack/local-file-explorer-module`, `@loopstack/remote-file-explorer-module` | File-tree browser sidebar                        |
| `secrets`      | `@loopstack/secrets-module` (`SecretsModule.forFeature(config)`)                  | Workspace secrets management UI                  |

To enable a feature, import the corresponding module's `forFeature()` (or `forRoot()`) in your app's module graph. Features that aren't imported simply don't appear — Studio degrades gracefully and never assumes a feature is present.

> Feature registration is an internal mechanism — module authors call `registerFeature()` to declare a feature exists. Most users only need to know which features are available and how to enable them, both shown above.
