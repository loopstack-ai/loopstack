---
'@loopstack/code-workspace': minor
---

A provisioned container reports its own readiness. `provision()` waits while `/health` answers `{ ready: false, phase }`, so an entry point that brings up services, an inner Docker daemon and an image store takes the time it needs; what the wait bounds is silence — three minutes without a new phase, fifteen for a whole boot. An image whose health route carries no `ready` field is ready as soon as it answers. A container that exits while its agent starts fails at once, with its exit code and the last lines of its own log, read out before the half-provisioned container is removed.
