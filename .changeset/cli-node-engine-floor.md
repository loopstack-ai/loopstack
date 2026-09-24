---
'@loopstack/cli': patch
---

Require Node 20.19 rather than 20.

The CLI is ESM and loads Loopstack packages that are too, which needs the `require(esm)` support Node added
in 20.19 — so `>=20` admitted versions where an install succeeds and the first run fails on a module it
cannot load. The floor now matches what the documentation has always stated, and npm says so at install time
instead.
