# @loopstack/claude-module

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
