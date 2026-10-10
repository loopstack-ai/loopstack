# @loopstack/handoff-module

## 0.1.0

### Minor Changes

- [#357](https://github.com/loopstack-ai/loopstack/pull/357) [`485ec60`](https://github.com/loopstack-ai/loopstack/commit/485ec608b8dfe58d6a834125e2bbf369471556d2) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `@loopstack/handoff-module`, the backend side of the Studio Handoff panel. `HandoffModule.forFeature()`
  registers the `handoff` feature. `HandoffDocument` shows a copy-a-command or open-a-URL card, and
  `ChangedFilesDocument` shows a changed-file tree with Zed, VS Code and file-explorer actions; both are tagged
  `handoff` and appear in the panel. `TerminalHandoffDocument` drives the CLI's `terminal-handoff` widget, and
  Studio renders it as a copy-the-command card with an "End session" button that fires `handoffDone` by hand.

### Patch Changes

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
