# @loopstack/observability-examples

## 0.1.1

### Patch Changes

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd) Thanks [@jakobklippel](https://github.com/jakobklippel)! - All tools declare `resultSchema` result contracts: every `@Tool` class ships a strict Zod schema describing its success result, exported alongside the result type. Results are validated by the tool pipeline; replayed test fixtures are held to the same contract as live results.

- [#247](https://github.com/loopstack-ai/loopstack/pull/247) [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).

- Updated dependencies [[`32e24b7`](https://github.com/loopstack-ai/loopstack/commit/32e24b7f626a29745fd8caba67d179c198200992), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`2cb5ce1`](https://github.com/loopstack-ai/loopstack/commit/2cb5ce1b791d25f36b4b2ee028aab99fb9e26f2f), [`2fa0496`](https://github.com/loopstack-ai/loopstack/commit/2fa0496105884671d07b449536ff84f4f482e1e2), [`d281a50`](https://github.com/loopstack-ai/loopstack/commit/d281a5006432194632f3c417e958740fd29108e7), [`3aacf9e`](https://github.com/loopstack-ai/loopstack/commit/3aacf9ecc319cd400b9ff43534e880fab979f8a4), [`e633ce1`](https://github.com/loopstack-ai/loopstack/commit/e633ce1ba1ecf7f7523add8290628dc6de7e42bd), [`5d326be`](https://github.com/loopstack-ai/loopstack/commit/5d326be5640e75a827a8dd0ac6a0f39a3599ea72), [`26a1c2b`](https://github.com/loopstack-ai/loopstack/commit/26a1c2bf40022d051ba016058c0ac17ece1f2edd)]:
  - @loopstack/contracts@0.38.0
  - @loopstack/common@0.38.0
  - @loopstack/quota@0.25.7
