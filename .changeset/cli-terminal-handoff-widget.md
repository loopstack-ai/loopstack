---
'@loopstack/cli': minor
---

Add a `terminal-handoff` widget. A workflow can present a `terminal-handoff` document widget carrying a `command`; on a TTY the CLI runs that command with an inherited terminal (handing the session over, e.g. to an interactive `claude` in a container) and fires the widget's transition when the command exits. Off a TTY it prints the command instead.
