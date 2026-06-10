---
title: AI Token Usage Tracking
description: Reading LlmUsage from LLM tool results. Every LLM tool (LlmGenerateTextTool, LlmGenerateObjectTool, document generation) returns LlmResultMeta with provider, model, and a usage breakdown — inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens, reasoningTokens.
---

# AI Token Usage Tracking

Every LLM tool call returns token usage on `result.metadata`. The shape is the same regardless of which tool produced the result — `LlmGenerateTextTool`, `LlmGenerateObjectTool`, and any other LLM-backed tool all return `LlmResultMeta` with a `usage?: LlmUsage`. Read it to log costs, enforce budgets, or report consumption back to users.

## Result metadata shape

```typescript
type LlmResultMeta = {
  provider: string; // e.g. 'claude', 'openai'
  model: string; // e.g. 'claude-sonnet-4-6'
  usage?: LlmUsage;
};

interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  reasoningTokens?: number;
}
```

| Field                      | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `inputTokens`              | Prompt tokens sent to the model                                   |
| `outputTokens`             | Completion tokens produced                                        |
| `cacheCreationInputTokens` | Tokens written to the prompt cache (provider-dependent)           |
| `cacheReadInputTokens`     | Tokens served from the prompt cache                               |
| `reasoningTokens`          | Internal reasoning tokens (e.g. Claude thinking, OpenAI o-series) |

`usage` is optional — providers that don't report token counts will omit it.

## Reading usage from a tool call

```typescript
import type { LlmResultMeta } from '@loopstack/llm-provider-module';

const result = await this.llmGenerateText.call(
  { prompt: 'Write a haiku about coffee' },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);

const meta = result.metadata as LlmResultMeta | undefined;
const usage = meta?.usage;

if (usage) {
  console.log(
    `${meta!.provider}/${meta!.model}:`,
    `in=${usage.inputTokens}`,
    `out=${usage.outputTokens}`,
    `cacheRead=${usage.cacheReadInputTokens ?? 0}`,
  );
}
```

The same access pattern works for `LlmGenerateObjectTool` and any other LLM-backed tool that returns `LlmResultMeta`.

## Persisting usage in workflow state

If you need usage downstream (for billing, reporting, or aggregation across multiple calls), store `result.metadata` in the workflow state alongside the result:

```typescript
interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

@Transition({ to: 'prompt_executed' })
async prompt(state: PromptState, ctx: RunContext): Promise<PromptState> {
  const result = await this.llmGenerateText.call(
    { prompt: 'Write a haiku' },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
  return {
    llmResult: result.data,
    llmMeta: result.metadata as LlmResultMeta | undefined,
  };
}
```

## See also

- [Text Generation](./text-generation.md) — `LlmGenerateTextTool` call signature
- [Structured Output](./structured-output.md) — `LlmGenerateObjectTool` call signature
