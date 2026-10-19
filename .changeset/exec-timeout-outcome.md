---
'@loopstack/remote-client': patch
---

`POST /exec` reports a command it killed for running past its timeout as exit code 124, with a line in `stderr` saying how long it was given and that what it was writing was left unfinished.

Node's `exec` kills a timed-out command with SIGTERM, which leaves the exit code unset and both streams empty, so the caller could only report that the command failed and show nothing. For git that was actively misleading: a git killed mid-write leaves `.git/index.lock` behind, so the next command failed over a lock that had nothing to do with it.
