---
title: 'API: @loopstack/handoff-module'
description: 'Public API reference for @loopstack/handoff-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/handoff-module

## Classes

### ChangedFilesDocument

A per-run "changed files" review artifact surfaced in the Studio Handoff panel: the tree of files the run
edited, each openable in a local IDE (Zed, VS Code) or the in-Studio file explorer. Tagged `handoff` so it
shows in the panel; rendered by the `changed-files` widget. Save it under a stable key and re-save it so the
card reflects the latest state.

```ts
import { ChangedFilesDocument } from '@loopstack/handoff-module';
```

```ts
export class ChangedFilesDocument {
  hostRoot: string;
  paths: string[];
}
```

### HandoffDocument

A per-run hand-off command surfaced in the Studio "Handoff" sidebar panel. A workflow emits one (fully
resolved) when a hand-off becomes relevant; the panel shows every non-invalidated `handoff`-tagged document
for the run in view, and the run timeline renders the same card inline. Exactly one of `command` / `url` is
set: the card renders a copy button or an open link accordingly.

```ts
import { HandoffDocument } from '@loopstack/handoff-module';
```

```ts
export class HandoffDocument {
  title: string;
  description?: string;
  command?: string;
  url?: string;
}
```

### HandoffModule

NestJS module for the Studio `handoff` feature: a "Handoff" sidebar panel listing the run's
`handoff`-tagged documents (`HandoffDocument`, `ChangedFilesDocument`), plus the inline renderers for the
`handoff` and `changed-files` widgets in the run timeline.

Registration:

- `HandoffModule.forFeature(config?: { enabled?: boolean })` — registers the `handoff` feature on the
  importing `@StudioApp`, which lights up the panel and the renderers. The panel's contents are per-run:
  workflows save hand-off documents via `documentStore.save(HandoffDocument, …)`.

The document classes need no registration — import and save them. `TerminalHandoffDocument` is driven by
the CLI's `terminal-handoff` widget; with the feature enabled, Studio also renders it with an "End session"
button that fires `handoffDone` by hand.

```ts
import { HandoffModule } from '@loopstack/handoff-module';
```

```ts
export class HandoffModule {
  static forFeature(config?: { enabled?: boolean }): DynamicModule;
}
```

### TerminalHandoffDocument

A hand-off prompt: when `loopstack run` is following a run and this document arms (its `handoffDone`
transition is available at the current place), the CLI's `terminal-handoff` widget runs `command` with an
inherited TTY — the terminal becomes that process — and fires `handoffDone` when it exits. Studio renders
the same document as a copy-the-command card with an "End session" button that fires `handoffDone` by hand,
for a run nobody is following. The emitting workflow decides what `command` is and owns the `handoffDone`
wait transition.

```ts
import { TerminalHandoffDocument } from '@loopstack/handoff-module';
```

```ts
export class TerminalHandoffDocument {
  command: string;
  cwd?: string;
}
```

## Variables

### ChangedFilesSchema

Zod schema for `ChangedFilesDocument` content: a root directory on the user's machine plus the paths
(relative to it) that the run changed.

```ts
import { ChangedFilesSchema } from '@loopstack/handoff-module';
```

```ts
ChangedFilesSchema: z.ZodObject<
  {
    hostRoot: z.ZodString;
    paths: z.ZodArray<z.ZodString>;
  },
  z.core.$strict
>;
```

### HANDOFF_DONE_TRANSITION

The transition the `terminal-handoff` widget fires once the local command exits.

```ts
import { HANDOFF_DONE_TRANSITION } from '@loopstack/handoff-module';
```

```ts
HANDOFF_DONE_TRANSITION = 'handoffDone';
```

### HANDOFF_TAG

Tag marking a document for the Studio "Handoff" sidebar panel.

```ts
import { HANDOFF_TAG } from '@loopstack/handoff-module';
```

```ts
HANDOFF_TAG = 'handoff';
```

### HandoffSchema

Zod schema for `HandoffDocument` content: a title, an optional description, and either a `command` to copy
or a `url` to open.

```ts
import { HandoffSchema } from '@loopstack/handoff-module';
```

```ts
HandoffSchema: z.ZodObject<
  {
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    command: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### TerminalHandoffSchema

Zod schema for `TerminalHandoffDocument` content: the local command to run and an optional working directory
shown alongside it.

```ts
import { TerminalHandoffSchema } from '@loopstack/handoff-module';
```

```ts
TerminalHandoffSchema: z.ZodObject<
  {
    command: z.ZodString;
    cwd: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```
