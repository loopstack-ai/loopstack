---
"@loopstack/cli": minor
---

`loopstack create` now scaffolds a real ESM app from a vetted template.

The generator copies a complete, hand-verified template (`type: module`,
`nodenext` module resolution, `.js` import extensions) instead of running
`nest new` and patching the CommonJS output to ESM afterwards. The template
ships pinned NestJS/runtime singletons and pulls the framework's runtime stack
transitively, so a fresh `create → npm install → npm run build → run` succeeds
with no `--legacy-peer-deps` and no manual ESM fixes. Dev runs use `tsx`
(`npm run start:dev`); production builds with `nest build`. Node baseline is
20.19+ / 22+.
