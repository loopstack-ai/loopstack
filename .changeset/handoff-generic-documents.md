---
'@loopstack/handoff': minor
---

The hand-off documents name no tool and no use case. The workflow that saves one decides every command, URL and text on it.

`ChangedFilesDocument` takes `actions`: each is a `label` plus a `command` to copy or a `url` to open, where `{path}` stands for the node's absolute path on the user's machine. Every file and folder of the tree offers them, in order.

`TerminalHandoffDocument` takes an optional `title` and `description` for the card. It still declares the `handoffDone` transition, which the workflow owns.

The documents carry no tag, and the package no longer exports `HANDOFF_TAG`.
