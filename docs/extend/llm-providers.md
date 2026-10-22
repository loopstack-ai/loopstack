---
title: Creating Custom LLM Providers
description: Implementing a new LLM provider with LlmProviderInterface and registering it with LlmProviderRegistry, shown on EchoLlmProvider, the runnable example provider. Covers the provider architecture, required methods, replaying message history written by other providers (meta.response, meta.provider, toProviderMessage), rejecting tools the provider cannot run, module setup, and streaming text_delta events.
---

# Creating LLM Providers

Add a new LLM provider to Loopstack by implementing `LlmProviderInterface` and registering it with the `LlmProviderRegistry`.

The code on this page is `EchoLlmProvider` from the [Custom Provider example](/docs/examples/llm#custom-provider). It answers with the last user message, so it runs without an API key or a model server. Copy it and replace the echo client with your API's SDK client.

## Architecture

```
@loopstack/llm-provider     ← contracts, registry, adapter tools, helpers
    ↑               ↑              ↑
@loopstack/claude  @loopstack/openai  your provider
```

- **`@loopstack/llm-provider`** — shared interfaces, `LlmProviderRegistry`, adapter tools (`LlmGenerateTextTool`, `LlmGenerateObjectTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`), shared helpers, and `LlmMessageDocument`
- **Provider modules** (e.g. `@loopstack/claude`, `@loopstack/openai`) — implement `LlmProviderInterface`, self-register at module init
- Adapter tools route to the correct provider at runtime based on the `provider` config value

## The API client

A provider calls its LLM through a client. For a real API this is the SDK client; the example uses `EchoClient`, which builds the response itself. What matters is the shape the provider works with: the API's own message format and its native response.

```typescript
/** A message in the echo API format. */
export interface EchoMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** The native echo API response — what a real provider receives from its SDK. */
export interface EchoResponse {
  id: string;
  model: string;
  role: 'assistant';
  content: string;
  usage: { inputWords: number; outputWords: number };
}

@Injectable()
export class EchoClient {
  async complete(request: { model: string; messages: EchoMessage[] }): Promise<EchoResponse> {
    // A real client sends the request to the LLM API here
  }
}
```

## Implement `LlmProviderInterface`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { DocumentEntity } from '@loopstack/common';
import type {
  LlmContext,
  LlmGenerateObjectResult,
  LlmGenerateTextArgs,
  LlmGenerateTextResult,
  LlmNormalizedMessage,
  LlmProviderInterface,
  LlmUsage,
} from '@loopstack/llm-provider';
import { LlmProviderRegistry } from '@loopstack/llm-provider';
import { EchoClient } from './echo-client';
import type { EchoMessage, EchoResponse } from './echo-client';

@Injectable()
export class EchoLlmProvider implements LlmProviderInterface, OnModuleInit {
  readonly providerId = 'echo';

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly client: EchoClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async generateText(args: LlmGenerateTextArgs, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    if (args.tools?.length) {
      throw new Error(`The echo provider cannot call tools: ${args.tools.map((tool) => tool.name).join(', ')}`);
    }

    const response = await this.client.complete({
      model: args.model ?? 'echo-1',
      messages: this.resolveMessages(args, ctx.documents),
    });

    // The echo API answers in one piece, so the provider streams the reply word by word.
    // `llm_generate_text` sends the `start` and `done` events itself.
    if (args.onStream && args.streamMessageId) {
      for (const delta of response.content.split(/(?<= )/)) {
        await args.onStream({ type: 'text_delta', messageId: args.streamMessageId, delta });
      }
    }

    return {
      message: this.normalizeResponse(response),
      response, // `llm_generate_text` saves it as `meta.response`, for `resolveMessages` to replay
    };
  }

  async generateObject(): Promise<LlmGenerateObjectResult> {
    throw new Error('The echo provider cannot generate structured output.');
  }

  extractUsage(response: unknown): LlmUsage | undefined {
    const usage = (response as EchoResponse | undefined)?.usage;
    if (!usage) return undefined;
    return { inputTokens: usage.inputWords, outputTokens: usage.outputWords };
  }

  /** Converts a message this provider did not write. Blocks the echo API cannot express are left out. */
  toProviderMessage(message: LlmNormalizedMessage): EchoMessage {
    const content = message.blocks?.length
      ? message.blocks.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n')
      : message.text;
    return { role: message.role, content };
  }

  private resolveMessages(args: LlmGenerateTextArgs, documents: DocumentEntity[]): EchoMessage[] {
    if (args.prompt) {
      return [{ role: 'user', content: args.prompt }];
    }

    if (args.messages?.length) {
      return args.messages.map((m) => this.toProviderMessage({ role: m.role, text: m.text ?? '', blocks: m.blocks }));
    }

    const tag = args.messagesSearchTag ?? 'message';
    return documents
      .filter((doc) => !doc.isInvalidated && doc.tags?.includes(tag))
      .sort((a, b) => a.index - b.index)
      .map((doc) => {
        // Only a response this provider wrote is in the echo format; any other message is converted
        const ownResponse = doc.meta?.provider === this.providerId ? (doc.meta.response as EchoResponse) : undefined;
        return ownResponse
          ? { role: ownResponse.role, content: ownResponse.content }
          : this.toProviderMessage(doc.content as LlmNormalizedMessage);
      });
  }

  private normalizeResponse(response: EchoResponse): LlmNormalizedMessage {
    return {
      id: response.id,
      role: 'assistant',
      text: response.content,
      blocks: [{ type: 'text', text: response.content }],
      stopReason: 'end_turn',
    };
  }
}
```

The echo API has no structured output, so `generateObject` throws. A provider whose API can constrain its output to a JSON Schema calls it with `args.outputSchema` and returns `{ data, response }`. A provider with settings of its own (temperature, max tokens) types them as `LlmProviderInterface<MyProviderConfig>` and reads them from `args.providerConfig`.

## The Interface

```typescript
interface LlmProviderInterface<TProviderConfig = Record<string, unknown>> {
  /** Unique provider identifier (e.g. 'echo'). Used in config. */
  readonly providerId: string;

  /** Invoke the LLM and return a normalized response. */
  generateText(args: LlmGenerateTextArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateTextResult>;

  /** Generate a structured object conforming to a JSON Schema. */
  generateObject(args: LlmGenerateObjectArgs<TProviderConfig>, ctx: LlmContext): Promise<LlmGenerateObjectResult>;

  /** Extract usage stats from the native API response. */
  extractUsage(response: unknown): LlmUsage | undefined;

  /** Convert normalized message to provider-specific message format. */
  toProviderMessage(message: LlmNormalizedMessage): unknown;
}
```

### Method responsibilities

| Method              | Purpose                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `generateText`      | Call the LLM API, return normalized `LlmNormalizedMessage` + native response              |
| `generateObject`    | Same but force structured output matching `args.outputSchema`                             |
| `extractUsage`      | Parse token usage from native response (for logging/quota)                                |
| `toProviderMessage` | Convert a normalized message to provider format (for history this provider did not write) |

### Replaying history

A conversation may switch provider between turns, so the history your provider reads can hold messages another provider wrote. Follow these rules in your message resolution:

1. **Replay `meta.response` only when you wrote it.** `LlmGenerateTextTool` saves the native response in `doc.meta.response` and your `providerId` in `doc.meta.provider`. Pass the native response back to your API only when `doc.meta.provider === this.providerId`; any other response is in another provider's format.
2. **Convert everything else with `toProviderMessage`.** Map every block your API can express — `text`, `tool_call`, `tool_result` — and leave out the blocks it cannot, such as another provider's `thinking` or `server_tool_use` / `server_tool_result` blocks.
3. **Reject server tools you cannot run.** A `server_tool` entry in `args.tools` carries one provider's native tool spec in `config`. Throw an error that names the tool instead of dropping it.

`EchoLlmProvider` follows all three. Its `resolveMessages` replays its own responses and converts the rest:

```typescript
const ownResponse = doc.meta?.provider === this.providerId ? (doc.meta.response as EchoResponse) : undefined;
return ownResponse
  ? { role: ownResponse.role, content: ownResponse.content }
  : this.toProviderMessage(doc.content as LlmNormalizedMessage);
```

The echo API can express only text, so its `toProviderMessage` keeps the `text` blocks and leaves out all others. It cannot run any tool, so `generateText` rejects every entry in `args.tools`.

### What you DON'T implement

Tool delegation (`delegateToolCalls`, `updateToolResult`) is handled by the shared `LlmDelegateService` and `LlmToolsHelperService` — they work identically for all providers. You only need to implement the LLM call itself.

## `LlmContext`

The context passed to provider methods:

```typescript
interface LlmContext {
  /** Runtime documents for the current workflow execution (used for message history). */
  documents: DocumentEntity[];
  /** Forwarded to the provider SDK call so an aborted run cancels the in-flight request. */
  signal?: AbortSignal;
}
```

Use `ctx.documents` with `args.messagesSearchTag` to resolve message history from saved documents. Pass `ctx.signal` to your API call so that a canceled run stops the request.

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
| `streamMessageId`   | `string?`            | Message ID for correlating stream events                  |

## Normalized message format

All providers must normalize their responses to `LlmNormalizedMessage`:

```typescript
interface LlmNormalizedMessage {
  id?: string;
  role: 'user' | 'assistant';
  text: string;
  blocks?: LlmContentBlock[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}
```

`text` is the plain-text projection (always populated). `blocks` is the structured form, present when the message contains non-text blocks (thinking, tool calls, tool results).

Content blocks are a union of:

- `{ type: 'text', text: string }` — text output
- `{ type: 'thinking', text: string }` — reasoning/thinking output
- `{ type: 'tool_call', id: string, name: string, args: Record<string, unknown> }` — tool call
- `{ type: 'tool_result', toolCallId: string, content: string, isError: boolean }` — tool result
- `{ type: 'server_tool_use', id: string, name: string, input: Record<string, unknown> }` — a server tool call the provider ran
- `{ type: 'server_tool_result', toolUseId: string, content: unknown }` — the result of that server tool call

## Create the module

```typescript
import { Module } from '@nestjs/common';
import { EchoClient } from './echo-client';
import { EchoLlmProvider } from './echo-llm-provider';

@Module({
  providers: [EchoClient, EchoLlmProvider],
  exports: [EchoClient, EchoLlmProvider],
})
export class EchoModule {}
```

## Usage

Users import your module — no other changes needed:

```typescript
@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), EchoModule],
})
export class AppModule {}
```

Then use it via config:

```typescript
const result = await this.llmGenerateText.call({ prompt: 'Hello' }, { config: { provider: 'echo', model: 'echo-1' } });
```

## Streaming support

`LlmGenerateTextTool` passes `args.onStream` and `args.streamMessageId` when a client in Studio can receive the response live. The tool itself sends the `start` event before it calls your provider, the `done` event with the final message after it, and the `error` event when your provider throws. Your provider sends only the content as it arrives: `text_delta`, `thinking_delta` and `tool_call` events.

```typescript
if (args.onStream && args.streamMessageId) {
  for (const delta of response.content.split(/(?<= )/)) {
    await args.onStream({ type: 'text_delta', messageId: args.streamMessageId, delta });
  }
}
```

A provider whose API streams sends each chunk as it receives it. Always return the complete final response as well, whether or not you streamed.

## Key types reference

| Type                      | Description                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `LlmProviderInterface`    | Contract for provider implementations                                                                        |
| `LlmProviderRegistry`     | Runtime registry — `register()`, `get()`, `has()`, `getProviderIds()`                                        |
| `LlmGenerateTextArgs`     | Input for text generation                                                                                    |
| `LlmGenerateTextResult`   | Response: `{ message, response }`                                                                            |
| `LlmGenerateObjectArgs`   | Input for structured output (includes `outputSchema`)                                                        |
| `LlmGenerateObjectResult` | Response: `{ data, response }`                                                                               |
| `LlmNormalizedMessage`    | Normalized message: `id`, `role`, `text`, `blocks`, `stopReason`                                             |
| `LlmContentBlock`         | Content block union: `text`, `thinking`, `tool_call`, `tool_result`, `server_tool_use`, `server_tool_result` |
| `LlmStopReason`           | `'end_turn'` \| `'tool_use'` \| `'max_tokens'` \| `'stop_sequence'`                                          |
| `LlmToolCall`             | Normalized tool call: `id`, `name`, `args`                                                                   |
| `LlmContext`              | Execution context with `documents`                                                                           |
| `LlmUsage`                | Token usage: `inputTokens`, `outputTokens`, optional cache/reasoning                                         |
| `LlmResultMeta`           | Metadata from adapter tools: `provider`, `model`, `usage`                                                    |
| `LlmConfigSchema`         | Shared Zod schema for model config passthrough                                                               |
| `LlmStreamEvent`          | Stream event union: `start`, `text_delta`, `thinking_delta`, `tool_call`, `done`, `error`                    |
| `LlmDelegateResult`       | Tool execution results: `allCompleted`, `toolResults`, `pendingCount`, `errorCount`, `hasErrors`, `errors`   |
