---
title: Handoff Module
description: Hand-offs from a Loopstack run to the user's machine — HandoffModule.forFeature() lights up the Studio hand-off cards; HandoffDocument (copy-a-command or open-a-URL card), ChangedFilesDocument (changed-file tree with the actions the workflow chooses, ChangedFilesAction with a {path} placeholder) and TerminalHandoffDocument (CLI terminal-handoff widget that fires handoffDone, HANDOFF_DONE_TRANSITION).
---

# @loopstack/handoff

> Hand-off documents for the [Loopstack](https://loopstack.ai) automation framework.

Lets a run hand work over to the user's own tools: a command to copy and run, a URL to open, a tree of changed
files to open in the user's editor, or — under `loopstack run` — the terminal itself. The documents name no
tool and no use case: the workflow that saves one decides every command, URL and text on it.

## When to Use

- **The run prepared something the user continues locally** — a shell command, an IDE to open, a preview URL.
  Save a `HandoffDocument`; it shows as a card in the run timeline.
- **The run edited files the user should review** — save a `ChangedFilesDocument` with the root directory, the
  changed paths and the actions each file and folder offers (copy an editor command, open an editor URL).
  Studio renders a file tree with those actions and an "open in the file explorer" action on every file.
- **The run should hand the terminal to an interactive process** — save a `TerminalHandoffDocument` and wait on
  `handoffDone`; the CLI runs the command with an inherited TTY and fires the transition when it exits. Studio
  shows the command to copy and a button that fires the transition by hand.

## Installation

```sh
npm install @loopstack/handoff
```

Register the Studio feature in the module graph of your `@StudioApp`:

```ts
import { Module } from '@nestjs/common';
import { HandoffModule } from '@loopstack/handoff';

@Module({
  imports: [HandoffModule.forFeature()],
})
export class AppModule {}
```

`forFeature()` registers the `handoff` feature: Studio renders the `handoff`, `changed-files` and
`terminal-handoff` widgets in the run timeline. Without it, those documents show as an unknown document type.
The CLI renders `TerminalHandoffDocument` on its own, with or without the feature.

## Quick Start

```ts
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { HandoffDocument } from '@loopstack/handoff';

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

| Document                  | Name               | Widget             | Content                                                               |
| ------------------------- | ------------------ | ------------------ | --------------------------------------------------------------------- |
| `HandoffDocument`         | `handoff`          | `handoff`          | `title`, `description?`, and one of `command` / `url`                 |
| `ChangedFilesDocument`    | `changed_files`    | `changed-files`    | `hostRoot` (absolute path on the user's machine), `paths`, `actions?` |
| `TerminalHandoffDocument` | `terminal_handoff` | `terminal-handoff` | `command`, `cwd?`, `title?`, `description?`; fires `handoffDone`      |

### Changed-file actions

Each entry of `actions` is a `label` (the tooltip) plus either a `command` to copy or a `url` to open. In both,
`{path}` stands for the node's absolute path on the user's machine, `<hostRoot>/<path>`; in a `url` it is
URI-encoded. Every file and folder of the tree offers the actions in the given order:

```ts
await this.documentStore.save(
  ChangedFilesDocument,
  {
    hostRoot: '/home/me/project',
    paths: ['src/app.ts', 'README.md'],
    actions: [
      { label: "Copy 'zed' command", command: 'zed "{path}"' },
      { label: 'Open in VS Code', url: 'vscode://file{path}' },
    ],
  },
  { key: 'changed_files' },
);
```

The commands and URLs run on the user's machine, so `hostRoot` must be a path that exists there — e.g. a
checkout bind-mounted into the container the run works in.

### Terminal hand-off

`TerminalHandoffDocument` declares the `handoffDone` transition (`HANDOFF_DONE_TRANSITION`). Save it at a place
where the workflow waits on a `handoffDone` transition: the CLI fires it when the command exits, and the Studio
button fires it by hand.
`title` and `description` head the Studio card, and the CLI names the hand-off by `title`; without them both
show neutral defaults.
