---
'@loopstack/cli': patch
---

`loopstack run` picks its workspace in one documented order: the `--workspace` flag, else the newest workspace of the app that declares the workflow, created when the app has none. An environment in `~/.loopstack/config.json` holds no workspace, so a run lands in the workflow's own app whichever environment or URL it targets.
