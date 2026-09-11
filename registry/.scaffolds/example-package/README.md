---
title: Example Scaffold
description: Boilerplate for a new Loopstack registry example package.
---

# Example Scaffold

Boilerplate for a new Loopstack **registry example package**. It is intentionally dependency-free (one
placeholder `StarterWorkflow`) so a fresh copy builds and boots immediately.

This directory is a **scaffold only** — it is excluded from the npm workspace and is **never edited in
place** by the Registry Examples engineer. To start a new example, copy the whole `example-package` directory
to `registry/examples/<your-example-name>/`, then:

1. Rename the package in `package.json` (`@loopstack/<name>-examples`), and update `displayName`/`description`/`keywords`.
2. Rename the module (`example-scaffold.module.ts` → `<name>.module.ts`, `ExampleScaffoldModule` → `<Name>Module`, and its `@StudioApp` title).
3. Replace `StarterWorkflow` with your example workflow(s); add any provider modules they need to both `package.json` and the module's `imports`.
4. Update this README for the new example.
