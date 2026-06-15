# @loopstack/claude-module

## 0.25.4

### Patch Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/llm-provider-module@0.6.0
  - @loopstack/common@0.35.0

## 0.25.3

### Patch Changes

- [#210](https://github.com/loopstack-ai/loopstack/pull/210) [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `LlmNormalizedMessage` exposes `text: string` as the plain-text projection (always populated by providers) and `blocks?: LlmContentBlock[]` as the structured form. `LlmMessageDocument` and inline `LlmMessage` args accept either field — `text` for plain content, `blocks` for structured blocks like tool results. Read `result.message.text` to get a guaranteed string; iterate `result.message.blocks` to inspect tool calls, thinking output, or render block-by-block.

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/llm-provider-module@0.5.0
  - @loopstack/common@0.34.0

## 0.25.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/llm-provider-module@0.4.2

## 0.25.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/llm-provider-module@0.4.1
  - @loopstack/common@0.32.3

## 0.25.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/llm-provider-module@0.4.0
  - @loopstack/common@0.32.0

## 0.24.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1), [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/llm-provider-module@0.3.1

## 0.24.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/llm-provider-module@0.3.0

## 0.23.0

### Minor Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add provider-agnostic LLM registry with adapter tools, tool/workflow config system, and multi-provider support (Claude + OpenAI)

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/llm-provider-module@0.2.0

## 0.22.5

### Patch Changes

- [#135](https://github.com/loopstack-ai/loopstack/pull/135) [`6f6f203`](https://github.com/loopstack-ai/loopstack/commit/6f6f203d56e42c1c45d7d13b1641cbbd24d07fb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add error tracking and aggregation to delegate tool calls with sub-workflow failure detection

- [#135](https://github.com/loopstack-ai/loopstack/pull/135) [`df77219`](https://github.com/loopstack-ai/loopstack/commit/df77219aef8278619a895c496493b12d85122f21) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add seatch tool and git worktree feature

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0

## 0.22.4

### Patch Changes

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0

## 0.22.3

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0

## 0.22.2

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/common@0.25.2
  - @loopstack/core@0.25.2

## 0.22.1

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/common@0.25.1
  - @loopstack/core@0.25.1

## 0.22.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate document UI schemas to unified widgets array format

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/core@0.25.0
  - @loopstack/common@0.25.0

## 0.21.1

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate registry modules from core-ui-module to core and enhance tool call tracking
  - Replace @loopstack/core-ui-module dependency with @loopstack/core across all registry modules
  - Add tool call extraction (ToolCallEntry/ToolCallsMap) to ai-module and claude-module
  - Refactor claude-module to use StateMachineToolCallProcessorService for tool execution
  - Update effects API from single object to array of ToolSideEffects

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0

## 0.21.0

### Minor Changes

- [#106](https://github.com/loopstack-ai/loopstack/pull/106) [`c36038f`](https://github.com/loopstack-ai/loopstack/commit/c36038f110f74e1ae8961866d95406da7a19e8a2) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add Claude integration module with text/object/document generation tools and tool delegation via Anthropic SDK
