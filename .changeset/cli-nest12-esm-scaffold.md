---
"@loopstack/cli": minor
---

`loopstack create` now scaffolds a NestJS 12 ESM app based on the official `ts-esm` starter: it runs via `nest start` / `nest build` (TypeScript 6) instead of `tsx`. This fixes silent dependency-injection failures where the `tsx`/esbuild dev runner dropped `emitDecoratorMetadata`, leaving constructor-injected providers `undefined` at runtime with no boot error. Scaffolded files are now written with readable modes (fixes `EACCES` on reads/edits under Docker Desktop bind mounts, where copies landed write-only). The scaffold's `CLAUDE.md` also documents that wait-transition payloads always arrive as objects (`z.object({ … })`, not a bare scalar) and that secrets configured in Loopstack are injected as environment variables at runtime.
