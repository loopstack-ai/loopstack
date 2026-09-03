---
"@loopstack/loopstack-studio": patch
---

Fix the studio build failing on case-sensitive filesystems.

`run-view/` had a `Transcript.tsx` component alongside a `transcript.ts` model, whose emitted declaration
files (`Transcript.d.ts` / `transcript.d.ts`) collide on case-insensitive filesystems (macOS) but not on
case-sensitive ones (Linux/CI/containers), where `vite-plugin-dts` then failed with an `ENOENT` unlink.
The model is renamed to `transcript-model.ts`, so the build works everywhere.
