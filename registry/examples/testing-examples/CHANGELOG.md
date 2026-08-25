# @loopstack/testing-examples

## 0.2.0

### Minor Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - First real testing examples: a deterministic ticket-triage workflow with specs demonstrating `testTool()` unit tests, `runWorkflow()` workflow tests with scripted HITL answers, and record/replay from a committed fixture.

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/common@0.38.0
