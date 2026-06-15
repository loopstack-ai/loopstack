# @loopstack/run-sub-workflow-example

## 0.24.0

### Minor Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `CallbackSchema` exposes `hasError: boolean` and `errorMessage: string | null` so a parent workflow can branch on a child's failure without parsing `status` strings or querying the child entity. The orchestrator populates both fields from the terminating child when it dispatches the parent's callback. The framework no longer auto-saves an `ErrorDocument` on caught transition exceptions — those failures surface via the workflow's own `errorMessage` field and the Retry affordance, so the document stream only contains errors explicitly recorded by user workflows. `@loopstack/run-sub-workflow-example` adds a `FailingSubWorkflow`, an `ErrorHandlingWorkflow` that exercises the error UI in both `show: 'inline'` and `show: 'link'` modes, and a `ShowModesWorkflow` that chains all three render modes (`inline → link → hidden`) in one flow.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `FanOutWorkflow` and `SequenceWorkflow` coordination primitives for launching multiple sub-workflows in parallel or sequentially with a single aggregated callback. Both support `'all'` (fail-fast, cancel siblings / abort) and `'allSettled'` failure modes, and accept items as either an ordered array or a keyed record (results mirror the input shape). Auto-registered by `LoopstackModule` — inject and call like any other sub-workflow. Demonstrated in `run-sub-workflow-example` alongside the existing sequential single-child demo.

### Patch Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `MessageDocument`'s field is renamed `content: string` → `text?: string` so it lines up with `LlmMessageDocument`, and its default tag changes from `['message']` to `['ui-message']`. The tag change means a `MessageDocument` is no longer picked up by LLM history collection (`messagesSearchTag` defaults to `'message'`) — plain UI bubbles stop leaking into the conversation context. `LlmMessageDocument` now extends `MessageDocument` for a shared base; its exposed fields (`role`, `text`, `blocks`, `stopReason`, `id`) are unchanged. To restore the old behaviour and feed a `MessageDocument` into LLM history, save it with explicit `tags: ['message']`.

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0

## 0.23.2

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `MessageDocument`'s field is renamed `content: string` → `text?: string` so it lines up with `LlmMessageDocument`, and its default tag changes from `['message']` to `['ui-message']`. The tag change means a `MessageDocument` is no longer picked up by LLM history collection (`messagesSearchTag` defaults to `'message'`) — plain UI bubbles stop leaking into the conversation context. `LlmMessageDocument` now extends `MessageDocument` for a shared base; its exposed fields (`role`, `text`, `blocks`, `stopReason`, `id`) are unchanged. To restore the old behaviour and feed a `MessageDocument` into LLM history, save it with explicit `tags: ['message']`.

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0

## 0.23.1

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename in example tools and workflows. Rewrite example READMEs and consolidate `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0

## 0.23.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/common@0.32.0

## 0.22.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.22.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0

## 0.21.7

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0

## 0.21.6

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0

## 0.21.5

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0

## 0.21.4

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0

## 0.21.3

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/create-chat-message-tool@0.21.3
  - @loopstack/common@0.25.2
  - @loopstack/core@0.25.2

## 0.21.2

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/create-chat-message-tool@0.21.2
  - @loopstack/common@0.25.1
  - @loopstack/core@0.25.1

## 0.21.1

### Patch Changes

- [#118](https://github.com/loopstack-ai/loopstack/pull/118) [`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update readme

- Updated dependencies [[`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805)]:
  - @loopstack/create-chat-message-tool@0.21.1

## 0.21.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/core@0.25.0
  - @loopstack/create-chat-message-tool@0.21.0
  - @loopstack/common@0.25.0

## 0.20.8

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add secrets and test-ui-documents examples, migrate all examples from core-ui-module to core
  - New secrets-example-workflow demonstrating secret request and verification flow
  - New test-ui-documents-example-workflow (moved from deleted core-ui-module)
  - Update all existing examples to use @loopstack/core instead of @loopstack/core-ui-module
  - Remove @loopstack/core-ui-module dependency from app-template

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8), [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0
  - @loopstack/create-chat-message-tool@0.20.7

## 0.20.7

### Patch Changes

- Updated dependencies [[`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/common@0.23.0
  - @loopstack/core-ui-module@0.20.6
  - @loopstack/create-chat-message-tool@0.20.6

## 0.20.6

### Patch Changes

- [#91](https://github.com/loopstack-ai/loopstack/pull/91) [`bc48dc9`](https://github.com/loopstack-ai/loopstack/commit/bc48dc961f90e84cf9fd3b253683556494328613) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub-workflow name reference in parent workflow

## 0.20.5

### Patch Changes

- Updated dependencies [[`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/common@0.22.0
  - @loopstack/core-ui-module@0.20.5
  - @loopstack/create-chat-message-tool@0.20.5

## 0.20.4

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0
  - @loopstack/create-chat-message-tool@0.20.4
  - @loopstack/core-ui-module@0.20.4

## 0.20.4-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/create-chat-message-tool@0.20.4-rc.0
  - @loopstack/core-ui-module@0.20.4-rc.0
  - @loopstack/common@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#77](https://github.com/loopstack-ai/loopstack/pull/77) [`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Create dependent packages auto configuration through cli

- Updated dependencies [[`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503)]:
  - @loopstack/create-chat-message-tool@0.20.3
  - @loopstack/core-ui-module@0.20.3

## 0.20.2

### Patch Changes

- [#73](https://github.com/loopstack-ai/loopstack/pull/73) [`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add standardized install mode handling for using loopstack cli

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow stateless workflow execution

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution, remove transition from template vars and in favour for use with runtime object

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution flow and improve ui

- Updated dependencies [[`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65), [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/create-chat-message-tool@0.20.2
  - @loopstack/core-ui-module@0.20.2
  - @loopstack/common@0.20.3

## 0.20.1

### Patch Changes

- [#69](https://github.com/loopstack-ai/loopstack/pull/69) [`bbdaef3`](https://github.com/loopstack-ai/loopstack/commit/bbdaef3ebe7bfdf57a1d4c63b901639255ed3f2a) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add Sub Workflow Example and Tests
