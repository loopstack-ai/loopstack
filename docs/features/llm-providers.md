# LLM Providers

Loopstack supports multiple LLM providers through a runtime registry. Provider modules self-register at startup. Workflows and tools resolve providers by name — swap or use multiple providers in parallel without changing workflow code.

## Quick Start

Import a provider module. That's it — the adapter tools are available globally.

```typescript
import { ClaudeModule } from '@loopstack/claude-module';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
})
export class AppModule {}
```

## Configuring Provider and Model

Configure provider and model at call sites via `options.config`:

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
// Pass config at call sites
const result = await this.llmGenerateText.call(
  { prompt: 'Hello!' },
  {
    config: {
      provider: 'claude',
      model: 'claude-opus-4-7',
      system: 'You are a helpful assistant.',
      messagesSearchTag: 'message',
      tools: ['get_weather'],
    },
  },
);
```

### Args vs Config

LLM tools separate **args** (per-request data) from **config** (provider/model/behavior settings):

| Parameter           | Location | Description                             |
| ------------------- | -------- | --------------------------------------- |
| `prompt`            | args     | Simple prompt string                    |
| `messages`          | args     | Explicit message array                  |
| `outputSchema`      | args     | JSON Schema (generate object only)      |
| `provider`          | config   | LLM provider name (e.g. `'claude'`)     |
| `model`             | config   | Model name (e.g. `'claude-sonnet-4-6'`) |
| `system`            | config   | System prompt                           |
| `messagesSearchTag` | config   | Load messages from documents by tag     |
| `tools`             | config   | Tool names the LLM can call             |

## Using Multiple Providers

Import both modules and configure each call with its provider:

```typescript
@Module({
  imports: [LoopCoreModule, ClaudeModule, OpenAiModule],
})
export class AppModule {}
```

```typescript
// Use Claude for complex tasks
const smartResult = await this.llmGenerateText.call(
  { prompt: 'Analyze this code...' },
  { config: { provider: 'claude', model: 'claude-opus-4-7' } },
);

// Use OpenAI for simple tasks
const fastResult = await this.llmGenerateText.call(
  { prompt: 'Summarize in one line...' },
  { config: { provider: 'openai', model: 'gpt-4o-mini' } },
);
```

## Adapter Tools

All LLM interactions go through adapter tools from `@loopstack/llm-provider-module`. This ensures validation, interceptors, and logging apply to every LLM call.

| Tool                       | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `LlmGenerateTextTool`      | Text generation with optional tool calling    |
| `LlmGenerateObjectTool`    | Structured output conforming to a JSON Schema |
| `LlmDelegateToolCallsTool` | Execute tool calls from an LLM response       |
| `LlmUpdateToolResultTool`  | Handle async tool completion callbacks        |

## Message Documents

All providers share a single `LlmMessageDocument` with normalized content. Native API responses are stored in `entity.meta.response` for provider-specific round-trips.

| Document             | Content Format                                      | Widget        |
| -------------------- | --------------------------------------------------- | ------------- |
| `LlmMessageDocument` | Normalized (`text`, `thinking`, `tool_call` blocks) | `llm-message` |

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
