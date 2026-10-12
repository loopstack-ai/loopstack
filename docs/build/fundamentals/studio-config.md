---
title: Studio Configuration
description: Reference for the `ui` option on @StudioApp. Documents StudioUiConfig, the StudioWidgetConfig widget array, and the app-level start-form widget (options workflow, title, subtitle, label) that adds launch cards with a workflow's args form to the workspace home page.
---

# Studio Configuration

The `ui` option on `@StudioApp` controls how an app is rendered in Loopstack Studio. This page is the single reference for those options. More options will be added over time.

## `ui.widgets`

`widgets` is an array of widget descriptors. Each entry names a widget and may pass widget-specific options.

```typescript
@StudioApp({
  title: 'My App',
  workflows: [ReportWorkflow],
  ui: {
    widgets: [{ widget: 'start-form', options: { workflow: 'report', title: 'Create a report' } }],
  },
})
@Module({
  /* ... */
})
export class MyAppModule {}
```

Each entry has:

- **`widget`** — the widget identifier
- **`options`** — optional, widget-specific configuration

At app level, Studio renders one widget: [`start-form`](#start-form). Document and workflow YAML configs use the same `{ widget, options }` format under `ui.widgets[]`, with their own widgets (for example `prompt-input`, `button` and `form`).

### `start-form`

A `start-form` entry adds a launch card to the workspace home page — the page Studio opens when you open a workspace of the app, for example after creating it from the app launcher. Each card starts one workflow. Several entries stack as several cards, in array order. An app without `start-form` entries has no home page content.

| Option     | Required | Default | Description                                                                                                                            |
| ---------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `workflow` | yes      | —       | Name of the workflow to start — `@Workflow({ name })`, or the class name without `Workflow`, snake_cased (`ReportWorkflow` → `report`) |
| `title`    | no       | —       | Heading of the card                                                                                                                    |
| `subtitle` | no       | —       | Short text under the heading                                                                                                           |
| `label`    | no       | `Run`   | Text of the submit button                                                                                                              |

Studio looks the workflow up among the app's `workflows`. When the workflow declares an args `schema`, the card renders it as a form and the submitted values become the run's args. Without a `schema` the card shows only the button, and the run starts without args.

On submit, Studio creates a run of the workflow in the current workspace, starts it, and opens it.

```typescript
@StudioApp({
  title: 'Maintenance',
  workflows: [StateReportWorkflow, CleanupWorkflow],
  ui: {
    widgets: [
      {
        widget: 'start-form',
        options: { workflow: 'state_report', title: 'What is on disk?', subtitle: 'Read-only.', label: 'Report' },
      },
      {
        widget: 'start-form',
        options: { workflow: 'cleanup', title: 'Reclaim orphaned state', label: 'Clean Up' },
      },
    ],
  },
})
```

## Available Features

Some registry modules light up additional Studio surfaces when imported by your app — sidebars, panels, or richer document widgets. Importing a module through its `forFeature()` (or `forRoot()`) registers its feature at bootstrap, and the feature then appears under `StudioAppConfig.features`, which Studio reads to decide what UI to expose. A bare import of the module class does not register the feature.

| Feature              | Registered by                                                                     | What it adds to Studio                                                                       |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `git`                | `@loopstack/git` (`GitModule.forFeature(config)`)                                 | Git status panel and version-control affordances                                             |
| `localFileExplorer`  | `@loopstack/local-file-explorer` (`LocalFileExplorerModule.forFeature(config)`)   | "Files" sidebar panel for browsing the local workspace filesystem                            |
| `remoteFileExplorer` | `@loopstack/remote-file-explorer` (`RemoteFileExplorerModule.forFeature(config)`) | "Remote Files" sidebar panel for browsing a remote workspace (requires `RemoteClientModule`) |
| `secrets`            | `@loopstack/secrets` (`SecretsModule.forFeature(config)`)                         | Workspace secrets management UI                                                              |
| `handoff`            | `@loopstack/handoff` (`HandoffModule.forFeature(config)`)                         | Handoff panel and the `handoff` / `changed-files` document widgets                           |

To enable a feature, import the corresponding module's `forFeature()` (or `forRoot()`) in your app's module graph. Features that aren't imported simply don't appear — Studio degrades gracefully and never assumes a feature is present.

> Feature registration is an internal mechanism — module authors call `registerFeature()` to declare a feature exists. Most users only need to know which features are available and how to enable them, both shown above.
