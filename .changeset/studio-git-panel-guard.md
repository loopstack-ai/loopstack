---
'@loopstack/loopstack-studio': patch
---

The Git panel no longer errors when the selected environment isn't running. It now skips the git status/log/remote requests (which returned a 500 with no connected agent) and shows a "no running environment" message instead, re-enabling automatically once an environment is live.
