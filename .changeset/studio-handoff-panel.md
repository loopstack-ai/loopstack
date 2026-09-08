---
'@loopstack/loopstack-studio': minor
---

Add a `handoff` sidebar feature. When an app registers the `handoff` feature, the workbench shows a "Handoff" panel built from the run's own `handoff`-tagged documents (so a workflow decides what to offer and when) — e.g. open the checkout in an editor, or resume the run's session in a terminal — plus a "Changed files" tree of the files the run edited, each openable in VS Code (a `vscode://file` link), copied as a shell command, or opened in the file explorer. Adds a workbench `openFileInExplorer(path)` bridge so a card can deep-link a file into the file-explorer panel, which resolves it against the loaded tree.
