---
title: Handoff Module
description: Hand-offs from a Loopstack run to the user's machine — HandoffModule.forFeature() lights up the Studio Handoff panel; HandoffDocument (copy-a-command or open-a-URL card), ChangedFilesDocument (changed-file tree with Zed / VS Code / file-explorer actions) and TerminalHandoffDocument (CLI terminal-handoff widget).
---

# @loopstack/handoff-module

> Hand-off documents for the [Loopstack](https://loopstack.ai) automation framework.

Lets a run hand work over to the user's own tools: a command to copy and run, a URL to open, a tree of changed
files to open in an IDE, or — under `loopstack run` — the terminal itself.

## When to Use

- **The run prepared something the user continues locally** — a shell command, an IDE to open, a preview URL.
  Save a `HandoffDocument`; it shows as a card in the Studio "Handoff" panel and in the run timeline.
- **The run edited files the user should review** — save a `ChangedFilesDocument` with the root directory and
  the changed paths; Studio renders a file tree with "open in Zed", "open in VS Code" and file-explorer
  actions.
- **The run should hand the terminal to an interactive process** — save a `TerminalHandoffDocument` and wait on
  `handoffDone`; the CLI runs the command with an inherited TTY and fires the transition when it exits. Studio
  shows the command to copy and an "End session" button that fires the transition by hand.

## Installation

```sh
npm install @loopstack/handoff-module
```

Register the Studio feature in the module graph of your `@StudioApp`:

```ts
import { Module } from '@nestjs/common';
import { HandoffModule } from '@loopstack/handoff-module';

@Module({
  imports: [HandoffModule.forFeature()],
})
export class AppModule {}
```

`forFeature()` registers the `handoff` feature: Studio shows the "Handoff" sidebar panel and renders the
`handoff`, `changed-files` and `terminal-handoff` widgets. Without it, those documents show as an unknown
document type. The CLI renders `TerminalHandoffDocument` on its own, with or without the feature.

## Quick Start

```ts
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { HandoffDocument } from '@loopstack/handoff-module';

@Workflow({ title: 'Preview', description: 'Starts a preview and hands its URL to the user.' })
export class PreviewWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async publish() {
    await this.documentStore.save(
      HandoffDocument,
      { title: 'Open the app', description: 'The preview is running.', url: 'http://localhost:3000' },
      { key: 'preview' },
    );
  }
}
```

Save each hand-off under a stable `key` so re-saving updates the card instead of adding another.

## Documents

| Document                  | Name               | Widget             | Tag       | Content                                                   |
| ------------------------- | ------------------ | ------------------ | --------- | --------------------------------------------------------- |
| `HandoffDocument`         | `handoff`          | `handoff`          | `handoff` | `title`, `description?`, and one of `command` / `url`     |
| `ChangedFilesDocument`    | `changed_files`    | `changed-files`    | `handoff` | `hostRoot` (absolute path on the user's machine), `paths` |
| `TerminalHandoffDocument` | `terminal_handoff` | `terminal-handoff` | —         | `command`, `cwd?`; `handoffDone` on exit or "End session" |

Every document tagged `handoff` (`HANDOFF_TAG`) appears in the Studio panel.

Studio builds the `ChangedFilesDocument` actions (`zed "<hostRoot>/<path>"`, `vscode://file<hostRoot>/<path>`)
on the user's machine, so `hostRoot` must be a path that exists there — e.g. a checkout bind-mounted into the
container the run works in.
