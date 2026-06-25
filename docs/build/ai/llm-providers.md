---
title: LLM Providers
description: Using multiple LLM providers (Claude, OpenAI) through the runtime provider registry. Covers LlmProviderModule setup, provider selection per-call, and switching providers without code changes.
---

# LLM Providers

Loopstack supports multiple LLM providers through a runtime registry. Provider modules self-register at startup. Workflows and tools resolve providers by name — swap or use multiple providers in parallel without changing workflow code.

## Quick Start

Import `LlmProviderModule` for the adapter tools and a provider module (e.g. `ClaudeModule`) to register the LLM backend:

```typescript
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule, ClaudeModule],
})
export class AppModule {}
```

> **`LlmProviderModule` is required, and must be imported before any provider module.**
>
> `LlmProviderModule` registers `LlmProviderRegistry` — the runtime registry that provider modules (`ClaudeModule`, `OpenAiModule`) inject to self-register their backends. Importing a provider module without `LlmProviderModule` fails at boot with `UnknownDependenciesException` on `LlmProviderRegistry` (and on `ClaudeLlmProvider` / `OpenAiLlmProvider`, which depend on it).
>
> Any of these forms registers the registry: bare `LlmProviderModule`, `LlmProviderModule.forRoot(config)`, or `LlmProviderModule.forFeature(config)` (the feature form imports the global root transitively). Pick `forRoot` when setting app-wide defaults, `forFeature` for per-module overrides, and the bare import when no defaults are needed.

## Module-Level Defaults

Use `LlmProviderModule.forRoot()` to set a default model for all LLM calls in your app. Use `forFeature()` to override per-module:

```typescript
// app.module.ts — global default model
@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-5' }), ClaudeModule],
})
export class AppModule {}
```

```typescript
// premium-feature.module.ts — this module uses a stronger model
@Module({
  imports: [LlmProviderModule.forFeature({ model: 'claude-opus-4-6' })],
  providers: [PremiumWorkflow],
})
export class PremiumFeatureModule {}
```

## Per-Call Configuration

Override provider and model at individual call sites via `options.config`. Per-call config always takes priority over module defaults.

```typescript
export class MyWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
  ) {
    super();
  }
}
```

```typescript
const result = await this.llmGenerateText.call(
  { prompt: 'Hello!' },
  {
    config: {
      provider: 'claude',
      model: 'claude-opus-4-6',
      system: 'You are a helpful assistant.',
      messagesSearchTag: 'message',
      tools: ['get_weather'],
    },
  },
);
```

### Args vs Config

LLM tools separate **args** (per-request data) from **config** (provider/model/behavior settings). For `LlmGenerateTextTool`, the input args are `prompt` and `messages`; `outputSchema` applies only to `LlmGenerateObjectTool`. See [Text Generation](./text-generation.md) for full call examples.

| Parameter           | Location | Description                                |
| ------------------- | -------- | ------------------------------------------ |
| `prompt`            | args     | Simple prompt string                       |
| `messages`          | args     | Explicit message array                     |
| `outputSchema`      | args     | JSON Schema (`LlmGenerateObjectTool` only) |
| `provider`          | config   | LLM provider name (e.g. `'claude'`)        |
| `model`             | config   | Model name (e.g. `'claude-sonnet-4-6'`)    |
| `system`            | config   | System prompt                              |
| `messagesSearchTag` | config   | Load messages from documents by tag        |
| `tools`             | config   | Tool names the LLM can call                |

## Using Multiple Providers

Import both modules and configure each call with its provider:

```typescript
@Module({
  imports: [LoopstackModule.forRoot(), ClaudeModule, OpenAiModule],
})
export class AppModule {}
```

```typescript
// Use Claude for complex tasks
const smartResult = await this.llmGenerateText.call(
  { prompt: 'Analyze this code...' },
  { config: { provider: 'claude', model: 'claude-opus-4-6' } },
);

// Use OpenAI for simple tasks
const fastResult = await this.llmGenerateText.call(
  { prompt: 'Summarize in one line...' },
  { config: { provider: 'openai', model: 'gpt-4o-mini' } },
);
```

## Provider-Specific Configuration

`config.providerConfig` is an opaque pass-through to the active provider — its shape depends on which provider handles the call. Use it for tuning behavior beyond the cross-provider config fields (system prompt, tools, etc.).

Provider-specific config is per-call only. The cross-provider fields `provider` and `model` can also be set at module level via `LlmProviderModule.forRoot()` / `forFeature()` (see [Module-Level Defaults](#module-level-defaults)) — per-call config always takes priority.

```typescript
await this.llmGenerateText.call(
  { prompt: 'Write a haiku about coffee' },
  {
    config: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      providerConfig: {
        maxTokens: 1024,
        temperature: 0.7,
        cache: true,
      },
    },
  },
);
```

### `ClaudeProviderConfig`

| Field           | Type       | Description                                                                                                                                                                                        |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxTokens`     | `number`   | Maximum tokens to generate                                                                                                                                                                         |
| `temperature`   | `number`   | Sampling temperature (0–1)                                                                                                                                                                         |
| `stopSequences` | `string[]` | Stop generation when any of these strings is produced                                                                                                                                              |
| `cache`         | `boolean`  | Enable Anthropic prompt caching. Places cache breakpoints on the system prompt, tool definitions, and the last message automatically — useful for multi-turn workflows where the prefix is reused. |
| `envApiKey`     | `string`   | Env var name holding the API key (defaults to `ANTHROPIC_API_KEY`)                                                                                                                                 |

### `OpenAiProviderConfig`

| Field              | Type       | Description                                                     |
| ------------------ | ---------- | --------------------------------------------------------------- |
| `maxTokens`        | `number`   | Maximum tokens to generate                                      |
| `temperature`      | `number`   | Sampling temperature (0–2)                                      |
| `stopSequences`    | `string[]` | Stop generation when any of these strings is produced           |
| `frequencyPenalty` | `number`   | -2.0 to 2.0; reduces token repetition                           |
| `presencePenalty`  | `number`   | -2.0 to 2.0; encourages topic diversity                         |
| `envApiKey`        | `string`   | Env var name holding the API key (defaults to `OPENAI_API_KEY`) |

## Adapter Tools

All LLM interactions go through adapter tools from `@loopstack/llm-provider-module`. This ensures validation, interceptors, and logging apply to every LLM call.

| Tool                       | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `LlmGenerateTextTool`      | Text generation with optional tool calling    |
| `LlmGenerateObjectTool`    | Structured output conforming to a JSON Schema |
| `LlmDelegateToolCallsTool` | Execute tool calls from an LLM response       |
| `LlmUpdateToolResultTool`  | Handle async tool completion callbacks        |

## Message Documents

All providers share a single `LlmMessageDocument` with normalized content. Native API responses are stored in `entity.meta.response` for provider-specific round-trips. See [Chat Flows — Message Resolution](./chat-flows.md#message-resolution) for how documents are collected from the document store and become the LLM's conversation history.

| Document             | Content Format                                      | Widget        |
| -------------------- | --------------------------------------------------- | ------------- |
| `LlmMessageDocument` | Normalized (`text`, `thinking`, `tool_call` blocks) | `llm-message` |

### Response shape

`LlmGenerateTextResult.data.message` is an `LlmNormalizedMessage` — two views of the same response:

| Field        | Type                                                          | Description                                                                                                                   |
| ------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `role`       | `'user' \| 'assistant'`                                       | Message role                                                                                                                  |
| `text`       | `string`                                                      | Plain-text projection — concatenated `text`-type blocks. Always populated by providers. Use this when you just want a string. |
| `blocks`     | `LlmContentBlock[]` (optional)                                | Structured content blocks. Use this to inspect tool calls, thinking output, or render block-by-block.                         |
| `stopReason` | `'end_turn' \| 'tool_use' \| 'max_tokens' \| 'stop_sequence'` | Why generation stopped                                                                                                        |
| `id`         | `string` (optional)                                           | Provider-assigned message ID                                                                                                  |

`text` is derived from `blocks` (text-type blocks joined with `\n`; `thinking` and tool blocks excluded). Both fields are populated by every provider, so you can pick whichever fits the call site without checking for `undefined`.

Content blocks are one of:

- `{ type: 'text', text: string }` — text output
- `{ type: 'thinking', text: string }` — reasoning/thinking output
- `{ type: 'tool_call', id: string, name: string, args: Record<string, unknown> }` — tool call
- `{ type: 'tool_result', toolCallId: string, content: string, isError: boolean }` — tool result (user-side, fed back to the LLM next turn)

### Writing messages — `text` vs `blocks`

Assistant messages (and the user-side `tool_result` turn) are saved automatically by `LlmGenerateTextTool` / `LlmDelegateToolCallsTool`. When you save an `LlmMessageDocument` manually — for user input, seed messages, or system primers — the same two fields are available, both optional. Provide whichever fits:

```typescript
// Plain text message — most common case
await this.documentStore.save(LlmMessageDocument, { role: 'user', text: 'Hello!' });

// Structured message — multi-block content
await this.documentStore.save(LlmMessageDocument, {
  role: 'user',
  blocks: [{ type: 'text', text: 'See attached.' }],
});
```

You don't need to fill both. The renderer and downstream providers fall back gracefully: if only `text` is set, it's rendered as a single text bubble; if only `blocks` is set, the text projection is derived from text-type blocks on demand.

See [Creating LLM Providers](../../extend/llm-providers.md) for the full interface.

## Environment Variables

| Variable            | Provider | Description            |
| ------------------- | -------- | ---------------------- |
| `ANTHROPIC_API_KEY` | Claude   | API key                |
| `OPENAI_API_KEY`    | OpenAI   | API key                |
| `CLAUDE_MODEL`      | Claude   | Default model fallback |
| `OPENAI_MODEL`      | OpenAI   | Default model fallback |

## Available Providers

| Provider         | Module                     | ID         |
| ---------------- | -------------------------- | ---------- |
| Anthropic Claude | `@loopstack/claude-module` | `'claude'` |
| OpenAI           | `@loopstack/openai-module` | `'openai'` |

To create a custom provider, see [Creating LLM Providers](../../extend/llm-providers.md).
