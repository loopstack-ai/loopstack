---
'@loopstack/code-workspace': minor
---

`bindSeedImages(images)` is a method of `CodeWorkspaceProvisioner`: it exports the host images a dind container loads on boot and returns the read-only bind that exposes them. The free function of the same name is gone; `SEED_IMAGES_MOUNT` is still exported.
