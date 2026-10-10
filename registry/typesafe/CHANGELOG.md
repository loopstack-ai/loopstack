# @loopstack/typesafe-module

## 0.2.0

### Minor Changes

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`e194666`](https://github.com/loopstack-ai/loopstack/commit/e194666b8cada794df5f430e263b3b67714be6b2) Thanks [@jakobklippel](https://github.com/jakobklippel)! - One name per registry package: the directory under `registry/`, the npm name and the docs page share it, and
  the `-module` / `-tool` suffixes are gone.
  - `@loopstack/claude`, `@loopstack/claude-tools`, `@loopstack/git`, `@loopstack/github`,
    `@loopstack/google-workspace`, `@loopstack/handoff`, `@loopstack/llm-provider`,
    `@loopstack/local-file-explorer`, `@loopstack/mcp`, `@loopstack/oauth`, `@loopstack/openai`,
    `@loopstack/remote-file-explorer`, `@loopstack/secrets`, `@loopstack/typesafe`, `@loopstack/web` — published
    under these names from now on.
  - `@loopstack/docker-sandbox` and `@loopstack/docker-sandbox-filesystem` — the Docker sandbox pair.
  - `@loopstack/cli`: `create` scaffolds `@loopstack/claude`.

### Patch Changes

- Updated dependencies [[`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522)]:
  - @loopstack/common@0.45.0

## 0.1.0

### Minor Changes

- [#423](https://github.com/loopstack-ai/loopstack/pull/423) [`d8b8b98`](https://github.com/loopstack-ai/loopstack/commit/d8b8b989bfcc900e200e8a784be627e746a6d67b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `@loopstack/typesafe-module` for typed decisions and classifications with TypeSafe AI (`jev` models).
  `TypeSafeModule` provides the `typesafe_system_one` tool (`TypeSafeSystemOneTool`), which answers named yes/no
  (`noul`), `choice` and `score` questions about a state and returns `{ model, answers, usage }`, with
  `{ provider: 'typesafe', model, usage }` as metadata. `TypeSafeClientService` reads the API key from
  `TYPESAFE_API_KEY` (override the env var name with `envApiKey`) and exposes `systemOne()` with answer types
  inferred from your question labels. The package re-exports the SDK's `choice`, `noul` and `score` builders and
  its error classes.

  ```ts
  const { data } = await this.typesafe.call({
    state: 'I was charged twice.',
    questions: { category: choice('What is this ticket about?', { billing: null, other: null }) },
  });
  ```

### Patch Changes

- Updated dependencies [[`e0552a8`](https://github.com/loopstack-ai/loopstack/commit/e0552a8561926988c3926fe125ab7633c7eea0f3)]:
  - @loopstack/common@0.44.1
