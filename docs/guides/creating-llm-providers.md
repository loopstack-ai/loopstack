# Creating LLM Providers

Add a new LLM provider to Loopstack by implementing `LlmProviderInterface` and registering it with the `LlmProviderRegistry`.

## Architecture

```
@loopstack/llm-provider-module     ← contracts, registry, adapter tools, helpers
    ↑               ↑              ↑
claude-module    openai-module   your-module
```

- **`@loopstack/llm-provider-module`** — shared interfaces, `LlmProviderRegistry`, adapter tools (`LlmGenerateTextTool`, `LlmGenerateObjectTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`), shared helpers, and `LlmMessageDocument`
- **Provider modules** (e.g. `@loopstack/claude-module`, `@loopstack/openai-module`) — implement `LlmProviderInterface`, self-register at module init
- Adapter tools route to the correct provider at runtime based on the `provider` config value

## Implement `LlmProviderInterface`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  LlmContext,
  LlmGenerateObjectArgs,
  LlmGenerateObjectResult,
  LlmGenerateTextArgs,
  LlmGenerateTextResult,
  LlmNormalizedMessage,
  LlmProviderInterface,
  LlmUsage,
} from '@loopstack/llm-provider-module';
import { LlmProviderRegistry } from '@loopstack/llm-provider-module';

@Injectable()
export class OllamaLlmProvider implements LlmProviderInterface, OnModuleInit {
  readonly providerId = 'ollama';

  constructor(private readonly registry: LlmProviderRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async generateText(args: LlmGenerateTextArgs, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    // 1. Resolve messages from ctx.documents (or use args.messages / args.prompt)
    // 2. Call your LLM API
    // 3. Normalize the response to LlmNormalizedMessage format
    // 4. Return { message, response }

    const nativeResponse = await this.callOllamaApi(args, ctx);

    return {
      message: this.normalizeResponse(nativeResponse),
      response: nativeResponse, // preserve native response for round-trips
    };
  }

  async generateObject(args: LlmGenerateObjectArgs, ctx: LlmContext): Promise<LlmGenerateObjectResult> {
    // Similar to generateText, but force structured output
    // Use args.outputSchema to constrain the response

    const nativeResponse = await this.callOllamaStructuredApi(args, ctx);

    return {
      data: nativeResponse.parsedOutput,
      response: nativeResponse,
    };
  }

  extractUsage(response: unknown): LlmUsage | undefined {
    // Extract token usage from the native API response
    const r = response as { usage?: { prompt_tokens: number; completion_tokens: number } };
    if (!r.usage) return undefined;
    return {
      inputTokens: r.usage.prompt_tokens,
      outputTokens: r.usage.completion_tokens,
    };
  }

  toProviderMessage(content: LlmNormalizedMessage): unknown {
    // Convert normalized content back to provider-specific message format
    // Used by resolveMessages() for API round-trips
    return {
      role: content.role,
      content:
        typeof content.content === 'string'
          ? content.content
          : content.content.map((block) => this.convertBlock(block)),
    };
  }
}
```

## The Interface

```typescript
interface LlmProviderInterface<TProviderConfig = Record<string, unknown>> {
  /** Unique provider identifier (e.g. 'ollama'). Used in config. */
  readonly providerId: string;

  /** Invoke the LLM and return a normalized response. */
  generateText(args: LlmGenerateTextArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateTextResult>;

  /** Generate a structured object conforming to a JSON Schema. */
  generateObject(args: LlmGenerateObjectArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateObjectResult>;

  /** Extract usage stats from the native API response. */
  extractUsage(response: unknown): LlmUsage | undefined;

  /** Convert normalized content to provider-specific message format. */
  toProviderMessage(content: LlmNormalizedMessage): unknown;
}
```

### Method responsibilities

| Method              | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `generateText`      | Call the LLM API, return normalized `LlmNormalizedMessage` + native response          |
| `generateObject`    | Same but force structured output matching `args.outputSchema`                         |
| `extractUsage`      | Parse token usage from native response (for logging/quota)                            |
| `toProviderMessage` | Convert normalized messages back to provider format (for message history round-trips) |

### What you DON'T implement

Tool delegation (`delegateToolCalls`, `updateToolResult`) is handled by the shared `LlmDelegateService` and `LlmToolsHelperService` — they work identically for all providers. You only need to implement the LLM call itself.

## `LlmContext`

The context passed to provider methods:

```typescript
interface LlmContext {
  /** Runtime documents for the current workflow execution (used for message history). */
  documents: DocumentEntity[];
}
```

Use `ctx.documents` with `args.messagesSearchTag` to resolve message history from saved documents.

## `LlmGenerateTextArgs`

The args your `generateText` method receives:

| Field               | Type                 | Description                                               |
| ------------------- | -------------------- | --------------------------------------------------------- |
| `system`            | `string?`            | System prompt                                             |
| `messages`          | `LlmMessage[]?`      | Explicit messages (alternative to document-based history) |
| `prompt`            | `string?`            | Simple prompt string                                      |
| `messagesSearchTag` | `string?`            | Tag to filter documents as message history                |
| `tools`             | `LlmResolvedTool[]?` | Tool definitions the LLM can call                         |
| `model`             | `string?`            | Model name                                                |
| `providerConfig`    | `TProviderConfig?`   | Provider-specific config (temperature, maxTokens, etc.)   |
| `onStream`          | `LlmStreamHandler?`  | Optional streaming callback                               |

## Normalized message format

All providers must normalize their responses to `LlmNormalizedMessage`:

```typescript
interface LlmNormalizedMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}
```

Content blocks are a union of:

- `{ type: 'text', text: string }` — text output
- `{ type: 'thinking', thinking: string }` — reasoning/thinking output
- `{ type: 'tool_use', id: string, name: string, input: Record<string, unknown> }` — tool call

## Create the module

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { OllamaLlmProvider } from './ollama-llm-provider';
import { OllamaClientService } from './services/ollama-client.service';

@Module({
  imports: [LlmProviderModule],
  providers: [OllamaClientService, OllamaLlmProvider],
  exports: [OllamaClientService, OllamaLlmProvider],
})
export class OllamaModule {}
```

## Usage

Users import your module — no other changes needed:

```typescript
@Module({
  imports: [LoopCoreModule, OllamaModule],
})
export class AppModule {}
```

Then use it via config:

```typescript
const result = await this.llmGenerateText.call(
  { prompt: 'Hello' },
  { config: { provider: 'ollama', model: 'llama3' } },
);
```

## Streaming support

If your provider supports streaming, use the `args.onStream` callback:

```typescript
async generateText(args: LlmGenerateTextArgs, ctx: LlmContext): Promise<LlmGenerateTextResult> {
  const stream = this.client.stream(/* ... */);

  if (args.onStream) {
    const messageId = args.streamMessageId ?? crypto.randomUUID();
    await args.onStream({ type: 'start', messageId });

    for await (const chunk of stream) {
      await args.onStream({ type: 'text_delta', messageId, delta: chunk.text });
    }

    const finalMessage = this.normalizeResponse(stream.finalResponse);
    await args.onStream({ type: 'done', messageId, message: finalMessage });
  }

  // Always return the complete final response regardless of streaming
  return { message: finalMessage, response: stream.finalResponse };
}
```

## Key types reference

| Type                      | Description                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `LlmProviderInterface`    | Contract for provider implementations                                                     |
| `LlmProviderRegistry`     | Runtime registry — `register()`, `get()`, `has()`                                         |
| `LlmGenerateTextArgs`     | Input for text generation                                                                 |
| `LlmGenerateTextResult`   | Response: `{ message, response }`                                                         |
| `LlmGenerateObjectArgs`   | Input for structured output (includes `outputSchema`)                                     |
| `LlmGenerateObjectResult` | Response: `{ data, response }`                                                            |
| `LlmNormalizedMessage`    | Normalized message: `role`, `content`, `stopReason`                                       |
| `LlmContentBlock`         | Content block union: `text`, `thinking`, `tool_use`                                       |
| `LlmStopReason`           | `'end_turn'` \| `'tool_use'` \| `'max_tokens'` \| `'stop_sequence'`                       |
| `LlmToolCall`             | Normalized tool call: `id`, `name`, `args`                                                |
| `LlmContext`              | Execution context with `documents`                                                        |
| `LlmUsage`                | Token usage: `inputTokens`, `outputTokens`, optional cache/reasoning                      |
| `LlmResultMeta`           | Metadata from adapter tools: `provider`, `model`, `usage`                                 |
| `LlmConfigSchema`         | Shared Zod schema for model config passthrough                                            |
| `LlmStreamEvent`          | Stream event union: `start`, `text_delta`, `thinking_delta`, `tool_call`, `done`, `error` |
| `LlmDelegateResult`       | Tool execution results: `allCompleted`, `toolResults`, `pendingCount`, `errors`           |
