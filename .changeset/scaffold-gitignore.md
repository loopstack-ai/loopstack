---
'@loopstack/cli': patch
---

`loopstack create` scaffolds a `.gitignore` (`node_modules/`, `dist/`, `.env`, `*.log`), so the initial commit holds
the project and not its dependencies or the `.env` the scaffold writes.
