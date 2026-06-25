---
'@loopstack/agent': patch
'@loopstack/api': patch
'@loopstack/code-agent': patch
'@loopstack/common': minor
'@loopstack/contracts': patch
'@loopstack/core': minor
'@loopstack/github-integration': patch
'@loopstack/github-module': patch
'@loopstack/hitl': patch
'@loopstack/llm-provider-module': patch
'@loopstack/oauth-module': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/agent-examples': patch
'@loopstack/hitl-examples': patch
'@loopstack/oauth-examples': patch
---

Unify the `wait: true` payload shape. Every wait transition now receives the same envelope, `TransitionInput<TData, TMeta>`, regardless of whether the resume came from a sub-workflow completion or a frontend / API trigger:

```ts
interface TransitionInput<TData = unknown, TMeta = unknown> {
  workflowId: string;
  status: 'completed' | 'failed' | 'canceled';
  hasError: boolean;
  errorMessage: string | null;
  data: TData;
  meta?: TMeta;
}
```

The `schema:` option on `@Transition({ wait: true })` now describes **only `data`** — the framework constructs the surrounding envelope. Authors no longer extend a base callback schema; they declare the data shape they expect and receive the full envelope on the transition method. The frontend can now signal `status: 'failed' | 'canceled'` + `errorMessage` via the `/processor/run/:workflowId` API so user-driven HITL flows can model "user declined" alongside sub-workflow failures using the same `input.hasError` branch.

**Breaking changes:**

- `CallbackSchema` is removed from `@loopstack/common`. Replace `schema: CallbackSchema.extend({ data: z.object({ ... }) })` with `schema: z.object({ ... })` and type the parameter as `input: TransitionInput<TData>`.
- `FanOutCallbackSchema` / `FanOutCallbackPayload` are removed from `@loopstack/core` and replaced with `FanOutResultSchema` (the inner data shape). Same for `SequenceCallbackSchema` / `SequenceCallbackPayload` → `SequenceResultSchema`.
- Wait transitions that previously received the raw payload directly (e.g. `payload: string` for chat user-input) now receive `input: TransitionInput<string>`; access via `input.data`.
- The orchestrator's callback envelope renames `_subscriberMetadata` → `meta`. `FanOutWorkflow` / `SequenceWorkflow` and `LlmDelegateService.updateToolResult()` now read correlation metadata from `input.meta` / `payload.meta`.

**Migration:**

```ts
// Before
import { CallbackSchema } from '@loopstack/common';
const AnswerCallback = CallbackSchema.extend({ data: z.object({ answer: z.string() }) });
@Transition({ wait: true, schema: AnswerCallback })
async onAnswer(state, payload: z.infer<typeof AnswerCallback>) {
  payload.data.answer;
  payload.hasError;
}

// After
import type { TransitionInput } from '@loopstack/common';
@Transition({ wait: true, schema: z.object({ answer: z.string() }) })
async onAnswer(state, input: TransitionInput<{ answer: string }>) {
  input.data.answer;
  input.hasError;
}
```

All registry features, examples, and docs (including `sub-workflows.md`, `human-in-the-loop.md`, `workflows.md`, the HITL tutorial, and every registry README) have been swept to the new shape. No backwards-compatibility shim — the old `CallbackSchema` export and the `_subscriberMetadata` field are removed outright.
