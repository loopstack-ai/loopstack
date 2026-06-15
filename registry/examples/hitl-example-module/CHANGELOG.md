# @loopstack/hitl-example-module

## 0.24.0

### Minor Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add `@loopstack/hitl-example-module` — a side-by-side reference of every HITL pattern: custom documents with form widgets (`InlineFormWorkflow`, `PromptInputChatWorkflow`), agent-driven asks via `ask_clarification` / `ask_for_approval` tools, and `AskUserWorkflow` / `ConfirmUserWorkflow` sub-workflow shortcuts. Includes a decision matrix for choosing between the three patterns. Replaces the narrower `hitl-ask-user-example-workflow` and `hitl-confirm-example-workflow` packages.

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/llm-provider-module@0.6.0
  - @loopstack/common@0.35.0
  - @loopstack/agent@0.5.4
  - @loopstack/hitl@0.4.4

## 0.1.0

### Minor Changes

- Initial release. Comprehensive Human-in-the-Loop example module covering custom-document-with-widget, sub-workflow shortcuts, and LLM-agent HITL tools.
