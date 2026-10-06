# @loopstack/git-examples

## 0.1.3

### Patch Changes

- [#407](https://github.com/loopstack-ai/loopstack/pull/407) [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every package declares the packages its code imports, so it loads under installs that don't hoist dependencies
  (npm `--install-strategy=nested`, pnpm `hoist=false`, Yarn PnP).
  - `@loopstack/common`: peer dependencies `@nestjs/common` and `typeorm`.
  - `@loopstack/core`: depends on `@loopstack/contracts`; peer dependencies `typeorm`, `@nestjs/typeorm` and
    `reflect-metadata`.
  - `@loopstack/api`: peer dependencies `typeorm`, `@nestjs/typeorm` and `zod`.
  - `@loopstack/auth`: peer dependencies `typeorm` and `@nestjs/typeorm`.
  - `@loopstack/testing`: peer dependency `typeorm`.
  - `@loopstack/google-workspace-module`: depends on `@loopstack/common`; peer dependency `@nestjs/common`.
  - `@loopstack/github-module`: peer dependency `@nestjs/common`.
  - `@loopstack/oauth-module`, `@loopstack/openai-module`, `@loopstack/llm-provider-module`: peer dependency
    `@nestjs/common`.
  - `@loopstack/remote-client`: peer dependencies `@nestjs/core`, `class-transformer` and `class-validator`.
  - `@loopstack/code-agent`: depends on `@loopstack/llm-provider-module`, whose types its module config uses.
  - `@loopstack/git-examples`: depends on `@loopstack/remote-client`.

- Updated dependencies [[`29c6aca`](https://github.com/loopstack-ai/loopstack/commit/29c6aca870013f271d5c03ca5d698547b6df45fb), [`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`1653b4e`](https://github.com/loopstack-ai/loopstack/commit/1653b4ecdedba892f08f58b75f5e8c63bcc155bf), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/github-integration@0.5.3
  - @loopstack/common@0.44.0
  - @loopstack/remote-client@0.29.0
  - @loopstack/git-module@0.5.2

## 0.1.2

### Patch Changes

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Bump `@nestjs/*` dependencies to v12.

- Updated dependencies [[`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5), [`300165b`](https://github.com/loopstack-ai/loopstack/commit/300165b5f158c916d07da9ada867cdeb69111aab)]:
  - @loopstack/git-module@0.5.0
  - @loopstack/github-integration@0.5.0
  - @loopstack/common@0.41.0

## 0.1.1

### Patch Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Transitions return nothing and mutate workflow state and result via four setter methods on `BaseWorkflow`:

  ```ts
  this.assignState(partial); // shallow merge into state
  this.setState(full); // replace state
  this.assignResult(partial); // shallow merge into the published result
  this.setResult(full); // replace the published result
  ```

  Setters are immediately visible to subsequent code in the same transition and are committed atomically with the existing per-transition DB transaction; on transition error the draft is discarded.

  The published result (`WorkflowEntity.result`) is no longer derived from the final transition's return value — call `assignResult` / `setResult` from any transition to build it incrementally.

  `@loopstack/testing` adds a `runTransition` helper that sets up an `ExecutionScope` around a transition invocation and returns the committed `{ state, result }` draft — the canonical way to unit-test a transition without going through the full processor.

  **Breaking changes:**
  - Transition methods return nothing. The processor throws if a transition returns a non-undefined value.
  - `return { ...state, foo }`, `return state`, and `return {}` no longer drive state or result. Replace with `this.assignState({ foo })` (or delete the return for no-op patterns).
  - The `to: 'end'` "return becomes result" shortcut is removed — final transitions that previously returned a result must call `this.setResult(...)`.
  - Unit tests that invoke transitions directly must use `runTransition` from `@loopstack/testing` (or set up an `ExecutionScope` manually) — the previous "assert on the return value" pattern no longer works.

  **Migration:**

  ```ts
  // Before
  @Transition({ to: 'next' })
  async myTransition(state): Promise<MyState> {
    const result = await this.someTool.call(...);
    return { ...state, foo: result.data };
  }

  @Transition({ from: 'compute', to: 'end' })
  async done(state): Promise<MyResult> {
    return this.buildResult(state);
  }

  // After
  @Transition({ to: 'next' })
  async myTransition(state) {
    const result = await this.someTool.call(...);
    this.assignState({ foo: result.data });
  }

  @Transition({ from: 'compute', to: 'end' })
  done(state) {
    this.setResult(this.buildResult(state));
  }
  ```

  Omit the `: Promise<void>` annotation; drop `async` when the body has no `await`.

  All registry features, examples, READMEs, and docs have been swept to the setter-based form. No backwards-compatibility shim — returning a value from a transition is a runtime error.

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/github-integration@0.4.5
  - @loopstack/git-module@0.3.5
