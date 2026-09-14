# package-tester

A minimal, **throwaway** Loopstack app used as the manual-test harness for the **Registry Examples** Core
Engineer template. It boots `LoopstackModule` + Studio; the engineer wires the example package(s) under test
into `src/app.module.ts` (and adds their deps to `package.json`), builds, and runs it so the example's
workflows can be exercised in the Studio frontend.

## Important: local test wiring is never committed

The example imports and dependencies the engineer adds here are **scratch test wiring**. They must never be
committed. A `pre-commit` hook installed into the engineer's checkout fails loudly if any file under
`sandbox/package-tester` is staged — unstage it and commit only the example package (and its `smoke-tests`
registration). The example's permanent home is `sandbox/smoke-tests`, not here.

Do not hand-edit this app to add a permanent example mount — that belongs in `smoke-tests`.
