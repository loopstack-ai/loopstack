---
'@loopstack/code-workspace': patch
---

Collecting superseded base generations reads only the checkout markers instead of measuring every checkout, so a base build no longer spends minutes on directory sizes after it publishes.
