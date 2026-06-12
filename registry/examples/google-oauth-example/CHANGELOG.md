# @loopstack/google-oauth-example

## 0.4.3

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Sub-workflow rendering is now controlled by a single `show` option on `RunOptions`, and the orchestrator auto-creates the link card so the parent's view never goes blank.

  `BaseWorkflow.run()` accepts `show?: 'inline' | 'link' | 'hidden'` (default `'inline'`) and `label?: string`. The orchestrator writes the matching `LinkDocument` into the parent's stream from `WorkflowOrchestrationService.queue()` while still inside the parent's `ExecutionScope`:
  - `'inline'` — `embed: true, expanded: true` (iframe in the parent's view). Right for HITL/OAuth/agents.
  - `'link'` — `embed: false` (status card opens in a separate window). Right for autonomous children.
  - `'hidden'` — no save. Right for fan-out / background work.

  The `status` field is removed from `LinkDocumentSchema`. The Studio `LinkCard` reads live status from `useChildWorkflows(parentId)` (already SSE-invalidated) and maps `WorkflowState` to its colored badge — there is no longer any denormalized status to keep in sync.

  All registry features, examples, and sandbox call sites drop their manual `documentStore.save(LinkDocument, …)` pairs around `subWorkflow.run()` and pass `show` + `label` on the `.run()` call instead.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/llm-provider-module@0.5.0
  - @loopstack/common@0.34.0
  - @loopstack/claude-module@0.25.3
  - @loopstack/oauth-module@0.4.3

## 0.4.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename in example tools and workflows. Rewrite example READMEs and consolidate `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/claude-module@0.25.2
  - @loopstack/google-workspace-module@0.5.2
  - @loopstack/llm-provider-module@0.4.2
  - @loopstack/oauth-module@0.4.2

## 0.4.1

### Patch Changes

- [#172](https://github.com/loopstack-ai/loopstack/pull/172) [`c6d2247`](https://github.com/loopstack-ai/loopstack/commit/c6d2247cfc481e6e703f2ecb1b31001fa02ea7c6) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Inject template renderer in BaseWorkflow and remove manual injection from examples

- Updated dependencies [[`c6d2247`](https://github.com/loopstack-ai/loopstack/commit/c6d2247cfc481e6e703f2ecb1b31001fa02ea7c6)]:
  - @loopstack/common@0.32.1

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/google-workspace-module@0.5.0
  - @loopstack/llm-provider-module@0.4.0
  - @loopstack/claude-module@0.25.0
  - @loopstack/oauth-module@0.4.0
  - @loopstack/common@0.32.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1), [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/claude-module@0.24.1
  - @loopstack/google-workspace-module@0.4.1
  - @loopstack/llm-provider-module@0.3.1
  - @loopstack/oauth-module@0.3.1

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/google-workspace-module@0.4.0
  - @loopstack/llm-provider-module@0.3.0
  - @loopstack/claude-module@0.24.0
  - @loopstack/oauth-module@0.3.0

## 0.2.7

### Patch Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Adapt tools and examples to LLM provider registry; fix optional tool args and call signatures

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/llm-provider-module@0.2.0
  - @loopstack/claude-module@0.23.0
  - @loopstack/oauth-module@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies [[`6f6f203`](https://github.com/loopstack-ai/loopstack/commit/6f6f203d56e42c1c45d7d13b1641cbbd24d07fb8), [`df77219`](https://github.com/loopstack-ai/loopstack/commit/df77219aef8278619a895c496493b12d85122f21), [`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/claude-module@0.22.5
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0
  - @loopstack/oauth-module@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0
  - @loopstack/claude-module@0.22.4
  - @loopstack/oauth-module@0.2.5

## 0.2.4

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0
  - @loopstack/claude-module@0.22.3
  - @loopstack/oauth-module@0.2.4

## 0.2.3

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/google-workspace-module@0.3.3
  - @loopstack/create-chat-message-tool@0.21.3
  - @loopstack/claude-module@0.22.2
  - @loopstack/oauth-module@0.2.3
  - @loopstack/common@0.25.2
  - @loopstack/core@0.25.2

## 0.2.2

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/google-workspace-module@0.3.2
  - @loopstack/create-chat-message-tool@0.21.2
  - @loopstack/claude-module@0.22.1
  - @loopstack/oauth-module@0.2.2
  - @loopstack/common@0.25.1
  - @loopstack/core@0.25.1

## 0.2.1

### Patch Changes

- [#118](https://github.com/loopstack-ai/loopstack/pull/118) [`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update readme

- Updated dependencies [[`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805)]:
  - @loopstack/google-workspace-module@0.3.1
  - @loopstack/create-chat-message-tool@0.21.1
  - @loopstack/oauth-module@0.2.1

## 0.2.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update example workflows to use new widgets UI schema format

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/core@0.25.0
  - @loopstack/claude-module@0.22.0
  - @loopstack/oauth-module@0.2.0
  - @loopstack/google-workspace-module@0.3.0
  - @loopstack/create-chat-message-tool@0.21.0
  - @loopstack/common@0.25.0

## 0.1.7

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`f002e07`](https://github.com/loopstack-ai/loopstack/commit/f002e07c1fb9727e25d09507ebef44219188eb2d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate OAuth examples to claude-module and add authentication task tools
  - Replace ai-module with claude-module across GitHub and Google OAuth examples
  - Add authenticate-github-task and authenticate-google-task tools for automatic OAuth handling
  - Update agent workflows with explicit authentication instructions and error detection
  - Refactor message format from parts array to Claude content structure

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8), [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0
  - @loopstack/claude-module@0.21.1
  - @loopstack/oauth-module@0.1.6
  - @loopstack/create-chat-message-tool@0.20.7

## 0.1.6

### Patch Changes

- Updated dependencies [[`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43), [`ba11102`](https://github.com/loopstack-ai/loopstack/commit/ba11102b8b79d0e7875c6b773b020ea0d5644d31)]:
  - @loopstack/core@0.23.1
  - @loopstack/google-workspace-module@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [[`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29), [`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/oauth-module@0.1.5
  - @loopstack/common@0.23.0
  - @loopstack/core-ui-module@0.20.6
  - @loopstack/core@0.23.0
  - @loopstack/create-chat-message-tool@0.20.6

## 0.1.4

### Patch Changes

- Updated dependencies [[`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/common@0.22.0
  - @loopstack/core@0.22.0
  - @loopstack/core-ui-module@0.20.5
  - @loopstack/oauth-module@0.1.4
  - @loopstack/create-chat-message-tool@0.20.5

## 0.1.3

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0
  - @loopstack/core@0.21.0
  - @loopstack/google-workspace-module@0.1.3
  - @loopstack/create-chat-message-tool@0.20.4
  - @loopstack/core-ui-module@0.20.4
  - @loopstack/oauth-module@0.1.3

## 0.1.3-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/google-workspace-module@0.1.3-rc.0
  - @loopstack/create-chat-message-tool@0.20.4-rc.0
  - @loopstack/core-ui-module@0.20.4-rc.0
  - @loopstack/oauth-module@0.1.3-rc.0
  - @loopstack/common@0.21.0-rc.0
  - @loopstack/core@0.21.0-rc.0

## 0.1.2

### Patch Changes

- [#77](https://github.com/loopstack-ai/loopstack/pull/77) [`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Create dependent packages auto configuration through cli

- Updated dependencies [[`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503)]:
  - @loopstack/google-workspace-module@0.1.2
  - @loopstack/create-chat-message-tool@0.20.3
  - @loopstack/core-ui-module@0.20.3
  - @loopstack/oauth-module@0.1.2

## 0.1.1

### Patch Changes

- [#73](https://github.com/loopstack-ai/loopstack/pull/73) [`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add standardized install mode handling for using loopstack cli

- Updated dependencies [[`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65), [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/google-workspace-module@0.1.1
  - @loopstack/create-chat-message-tool@0.20.2
  - @loopstack/core-ui-module@0.20.2
  - @loopstack/oauth-module@0.1.1
  - @loopstack/common@0.20.3
  - @loopstack/core@0.20.3
