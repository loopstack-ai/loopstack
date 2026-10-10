# @loopstack/claude-module

## 0.29.0

### Minor Changes

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`4d10d0f`](https://github.com/loopstack-ai/loopstack/commit/4d10d0fb22d777d1091b729b87cf86f66f48885a) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Registry packages export what their public API documents, and nothing else.
  - `@loopstack/mcp`: `McpClientLike`, `McpTransportLike`, `McpClientCtor` and `McpTransportCtor` are no longer
    exported.
  - `@loopstack/claude`: `ClaudeGenerateOptions` and `ClaudeToolDefinition` are no longer exported.
  - `@loopstack/agent`: exports `AgentFinishResultSchema` and `AgentFinishResult`, the result of `AgentFinishTool`.
  - `@loopstack/code-agent`: exports `ExploreTaskResultSchema`, the result schema of `ExploreTask`.

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

- Updated dependencies [[`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522), [`e194666`](https://github.com/loopstack-ai/loopstack/commit/e194666b8cada794df5f430e263b3b67714be6b2)]:
  - @loopstack/common@0.45.0
  - @loopstack/llm-provider@0.12.0

## 0.28.0

### Minor Changes

- [#363](https://github.com/loopstack-ai/loopstack/pull/363) [`1097b0b`](https://github.com/loopstack-ai/loopstack/commit/1097b0bb92539ca6a3a97be27861cdbc31a8bdc5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Name the two Claude web search tools after how they are used.
  - `@loopstack/claude-module` exports `ClaudeNativeWebSearchTool` (`claude_native_web_search`), with
    `ClaudeNativeWebSearchToolConfig` and `ClaudeNativeWebSearchToolConfigSchema`. It is Claude's provider-native
    web search: list it in an agent's or LLM call's `tools`, and Claude searches inside that call.
  - `@loopstack/claude-tools-module` exports `ClaudeWebSearchStepTool` (`claude_web_search_step`), with
    `ClaudeWebSearchStepArgs`, `ClaudeWebSearchStepConfig` and their schemas. It is a workflow step that makes its
    own Claude request through `claude_native_web_search` and returns the hits and commentary.

  To give an agent web search, list `claude_native_web_search` in its `tools`:

  ```ts
  await this.llmGenerateText.call({}, { config: { provider: 'claude', tools: ['claude_native_web_search'] } });
  ```

  `claude_web_search_step` always sends its request to the `claude` provider and does not save the reply as a
  conversation message, so a search adds nothing to the workflow's history.

### Patch Changes

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`e3c016e`](https://github.com/loopstack-ai/loopstack/commit/e3c016e73ed24178ec0a73b660fb496a787b3afe), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`369767e`](https://github.com/loopstack-ai/loopstack/commit/369767e035baebb2878d8b2877031216e77d969b), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
  - @loopstack/llm-provider-module@0.11.0

## 0.27.1

### Patch Changes

- Updated dependencies [[`686e121`](https://github.com/loopstack-ai/loopstack/commit/686e121704c2cbdf24bd21139121bd3c92dbc97d), [`6436004`](https://github.com/loopstack-ai/loopstack/commit/6436004c0c161d836e5ff416d39926f913fbbc8e), [`341aa7f`](https://github.com/loopstack-ai/loopstack/commit/341aa7fb85e437509a100b3af7e11e015626a22d)]:
  - @loopstack/common@0.42.0
  - @loopstack/llm-provider-module@0.10.1

## 0.27.0

### Minor Changes

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add NestJS 12 support. `@nestjs/common` / `@nestjs/core` / `@nestjs/platform-express` peer ranges are widened to `^11.0.0 || ^12.0.0`, and the first-party `@nestjs/*` dependencies (config, event-emitter, bullmq, schedule, typeorm, jwt, passport, microservices, testing) are bumped to their 12.x lines; `nest-commander` is bumped to `^3.21.0` for Nest 12 compatibility. Existing NestJS 11 applications continue to work unchanged.

### Patch Changes

- Updated dependencies [[`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5), [`300165b`](https://github.com/loopstack-ai/loopstack/commit/300165b5f158c916d07da9ada867cdeb69111aab)]:
  - @loopstack/llm-provider-module@0.10.0
  - @loopstack/common@0.41.0

## 0.26.1

### Patch Changes

- Updated dependencies [[`a2160e4`](https://github.com/loopstack-ai/loopstack/commit/a2160e4048d8d2d8bf48c35bd64b3033bf343ac8)]:
  - @loopstack/llm-provider-module@0.9.0
  - @loopstack/common@0.39.0

## 0.26.0

### Minor Changes

- [#243](https://github.com/loopstack-ai/loopstack/pull/243) [`fdfa5b0`](https://github.com/loopstack-ai/loopstack/commit/fdfa5b0b0f9e6617679d4889393876c2b5342d98) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The Claude provider emits `tool_call` stream events when a `tool_use` content block completes, so clients (Studio, CLI) can render tool calls live during the turn instead of waiting for the persisted message document.

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/common@0.38.0
  - @loopstack/llm-provider-module@0.8.0

## 0.25.6

### Patch Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387) Thanks [@jakobklippel](https://github.com/jakobklippel)! - READMEs gain the standard installation section (install command, verified module import, required env keys) — the registry-wide convention that replaces a `loopstack add` installer.

- Updated dependencies [[`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387)]:
  - @loopstack/llm-provider-module@0.7.1
  - @loopstack/common@0.37.0

## 0.25.5

### Patch Changes

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/llm-provider-module@0.7.0
  - @loopstack/common@0.36.0

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
