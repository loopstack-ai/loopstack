---
title: API: @loopstack/llm-provider-module
description: Public API reference for @loopstack/llm-provider-module
includeInLlmsFullTxt: false
---

# API: @loopstack/llm-provider-module

## Classes

### LlmContextDocument

Document that represents hidden LLM conversation context (never shown in Studio).

Persisted server-side and included by LLM providers when building conversation history
(tagged `'message'`), but marked `internal: true` so it is excluded from Studio's document
responses and never renders as a chat bubble. Its `role` is narrowed to `'user' | 'assistant'`.
Use it to seed the model with system context, prior steps, or workflow background the end user
should not see.

```ts
import { LlmContextDocument } from '@loopstack/llm-provider-module';
```

```ts
export class LlmContextDocument extends MessageDocument {
  role: 'user' | 'assistant';
}
```

### LlmDelegateToolCallsTool

Tool that executes the tool calls contained in an LLM response.

Extracts tool-use blocks from the normalized `message`, resolves them via the ToolRegistry,
and runs them through `LlmDelegateService `, scheduling async completions against the
provided `callback.transition`. Returns an `LlmDelegateResult` summarizing completed,
pending, and errored tool calls, and saves the results as an `LlmMessageDocument `
unless `config.save` is `false`.

```ts
import { LlmDelegateToolCallsTool } from '@loopstack/llm-provider-module';
```

**Provided by:** `LlmProviderModule`

```ts
export class LlmDelegateToolCallsTool extends BaseTool<
  LlmDelegateToolCallsToolArgs,
  LlmDelegateToolCallsConfig,
  LlmDelegateResult
> {
  protected handle(
    args: LlmDelegateToolCallsToolArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<LlmDelegateToolCallsConfig>,
  ): Promise<ToolEnvelope<LlmDelegateResult>>;
}
```

### LlmGenerateObjectTool

Tool that generates a structured object conforming to a Zod/JSON schema via the configured LLM provider.

Takes a `prompt` or `messages` plus an `outputSchema` (a Zod schema converted to JSON Schema)
and resolves provider, model, and system prompt from `options.config`. Returns an
`LlmGenerateObjectResult` whose `data` matches the schema, with usage in `LlmResultMeta`.

```ts
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
```

**Provided by:** `LlmProviderModule`

```ts
export class LlmGenerateObjectTool extends BaseTool<
  LlmGenerateObjectArgs,
  LlmGenerateObjectConfig,
  LlmGenerateObjectResult,
  LlmResultMeta
> {
  protected handle(
    args: LlmGenerateObjectArgs,
    ctx: RunContext,
    options?: ToolCallOptions<LlmGenerateObjectConfig>,
  ): Promise<ToolEnvelope<LlmGenerateObjectResult, LlmResultMeta>>;
}
```

### LlmGenerateTextTool

Tool that generates text with the configured LLM provider.

Accepts a `prompt` or a `messages` array and resolves provider, model, system prompt,
and tool names from `options.config`. Resolved tool names are turned into provider tool
definitions, and output is streamed to the client when streaming is available.
Returns an `LlmGenerateTextResult` with provider/model usage in `LlmResultMeta`.

```ts
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';
```

**Provided by:** `LlmProviderModule`

```ts
export class LlmGenerateTextTool extends BaseTool<
  LlmGenerateTextArgs,
  LlmGenerateTextConfig,
  LlmGenerateTextResult,
  LlmResultMeta
> {
  protected handle(
    args: LlmGenerateTextArgs,
    ctx: RunContext,
    options?: ToolCallOptions<LlmGenerateTextConfig>,
  ): Promise<ToolEnvelope<LlmGenerateTextResult, LlmResultMeta>>;
}
```

### LlmMessageDocument

Document that renders an LLM chat message in Studio.

Extends `MessageDocument` with a narrowed `role` of `'user' | 'assistant'`, an optional
message `id`, structured `blocks` (LLM content blocks), and a `stopReason`. Tagged
`'message'` so it participates in conversation history, and rendered via the
`llm-message.document.yaml` widget.

```ts
import { LlmMessageDocument } from '@loopstack/llm-provider-module';
```

```ts
export class LlmMessageDocument extends MessageDocument {
  role: 'user' | 'assistant';
  id?: string;
  blocks?: LlmContentBlock[];
  stopReason?: LlmStopReason;
}
```

### LlmProviderModule

NestJS module that provides the LLM tools (`LlmGenerateTextTool`,
`LlmGenerateObjectTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`)
and the provider registry, configured with provider/model defaults.

Registration:

- `LlmProviderModule` (bare import) — registers the global root with the default
  (empty) config; pair it with a provider module and set provider/model per call.
- `LlmProviderModule.forRoot(config)` — sets the app-wide default `LlmModuleConfig`
  (default provider/model). Import once at the root.
- `LlmProviderModule.forFeature(config)` — overrides the config for one module's
  tools without re-registering the global root. Use for a feature-scoped default.

Requires: a registered provider module (e.g. `ClaudeModule` / `OpenAiModule`)
imported alongside it — this module holds the registry, the provider modules
populate it.

```ts
import { LlmProviderModule } from '@loopstack/llm-provider-module';
```

```ts
export class LlmProviderModule {
  static forRoot(config: LlmModuleConfig): DynamicModule;
  static forFeature(config: LlmModuleConfig): DynamicModule;
}
```

### LlmUpdateToolResultTool

Tool that records an async tool completion and updates a pending delegate result.

Handles the callback fired when a delegated tool finishes: it merges `completedTool` into the
supplied `delegateResult` via `LlmDelegateService ` and returns the updated
`LlmDelegateResult`. Once all tool calls complete, results are saved as an
`LlmMessageDocument ` unless `config.save` is `false`.

```ts
import { LlmUpdateToolResultTool } from '@loopstack/llm-provider-module';
```

**Provided by:** `LlmProviderModule`

```ts
export class LlmUpdateToolResultTool extends BaseTool<
  LlmUpdateToolResultToolArgs,
  LlmUpdateToolResultConfig,
  LlmDelegateResult
> {
  protected handle(
    args: LlmUpdateToolResultToolArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<LlmUpdateToolResultConfig>,
  ): Promise<ToolEnvelope<LlmDelegateResult>>;
}
```

## Interfaces

### LlmDelegateResult

Result returned by tool-call delegation (`LlmDelegateToolCallsTool` and `LlmUpdateToolResultTool`).

- `allCompleted` — whether every delegated tool call has finished.
- `toolResults` — the collected `LlmToolResultEntry` items.
- `pendingCount` — number of tool calls still awaiting completion.
- `errorCount` / `hasErrors` / `errors` — error count, flag, and the `LlmToolErrorEntry` details.

```ts
import { LlmDelegateResult } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmDelegateResult {
  allCompleted: boolean;
  toolResults: LlmToolResultEntry[];
  pendingCount: number;
  errorCount: number;
  hasErrors: boolean;
  errors: LlmToolErrorEntry[];
}
```

### LlmGenerateObjectResult

Result returned by the `generateObject` provider operation (and `LlmGenerateObjectTool`)
— the structured `data` matching the output schema plus the native `response`.

```ts
import { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmGenerateObjectResult {
  data: unknown;
  response: unknown;
}
```

### LlmGenerateTextResult

Result returned by the `generateText` provider operation (and `LlmGenerateTextTool`).

- `message` — the normalized assistant message produced by the provider.
- `response` — the unmodified native API response (Anthropic.Message, OpenAI.ChatCompletion, etc.).

```ts
import { LlmGenerateTextResult } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmGenerateTextResult {
  message: LlmNormalizedMessage;
  response: unknown;
}
```

### LlmMessage

An inline message authors pass as prompt args — a `role` plus `text` and/or
structured `blocks`.

```ts
import { LlmMessage } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmMessage {
  role: 'user' | 'assistant';
  text?: string;
  blocks?: LlmContentBlock[];
}
```

### LlmModuleConfig

Config for `LlmProviderModule` — the default `provider` and `model` passed to
`forRoot()` / `forFeature()`.

```ts
import { LlmModuleConfig } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmModuleConfig {
  provider?: string;
  model?: string;
}
```

### LlmToolErrorEntry

A single tool-call error collected during delegation (part of `LlmDelegateResult`).

```ts
import { LlmToolErrorEntry } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmToolErrorEntry {
  toolName: string;
  toolCallId: string;
  message: string;
}
```

### LlmToolResultEntry

A single tool-call result collected during delegation (part of `LlmDelegateResult`).

```ts
import { LlmToolResultEntry } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmToolResultEntry {
  type: 'tool_result';
  toolCallId: string;
  content?: string;
  isError?: boolean;
}
```

### LlmUsage

Token usage stats reported by a provider for one LLM call.

```ts
import { LlmUsage } from '@loopstack/llm-provider-module';
```

```ts
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  reasoningTokens?: number;
}
```

## Type Aliases

### LlmConfig

Config for shared LLM passthrough, inferred from `LlmConfigSchema`.

```ts
import { LlmConfig } from '@loopstack/llm-provider-module';
```

```ts
export type LlmConfig = z.infer<typeof LlmConfigSchema>;
```

### LlmContentBlock

A single block of LLM message content (text, tool call, tool result, etc.).

```ts
import { LlmContentBlock } from '@loopstack/llm-provider-module';
```

```ts
export type LlmContentBlock = UIContentBlock;
```

### LlmNormalizedMessage

A provider-normalized LLM message, inferred from `LlmNormalizedMessageSchema`.

```ts
import { LlmNormalizedMessage } from '@loopstack/llm-provider-module';
```

```ts
export type LlmNormalizedMessage = z.infer<typeof LlmNormalizedMessageSchema>;
```

### LlmResultMeta

Metadata returned by the LLM tools (`LlmResultMeta` carries the resolved
`provider`, `model`, and `LlmUsage`).

```ts
import { LlmResultMeta } from '@loopstack/llm-provider-module';
```

```ts
export type LlmResultMeta = {
  provider: string;
  model: string;
  usage?: LlmUsage;
};
```

### LlmStopReason

The reason an LLM turn stopped (`end_turn`, `tool_use`, `max_tokens`, `stop_sequence`).

```ts
import { LlmStopReason } from '@loopstack/llm-provider-module';
```

```ts
export type LlmStopReason = NonNullable<LlmNormalizedMessage['stopReason']>;
```

## Variables

### LlmConfigSchema

Zod schema for the shared LLM config — import in parent workflows/tools to pass
`model` through as args.

```ts
import { LlmConfigSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmConfigSchema: z.ZodObject<
  {
    model: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
```

### LlmContentBlockSchema

Zod schema for a single LLM content block (text, tool call, tool result, etc.).

```ts
import { LlmContentBlockSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmContentBlockSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<'text'>;
        text: z.ZodString;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'thinking'>;
        text: z.ZodString;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'tool_call'>;
        id: z.ZodString;
        name: z.ZodString;
        args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'server_tool_use'>;
        id: z.ZodString;
        name: z.ZodString;
        input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'server_tool_result'>;
        toolUseId: z.ZodString;
        content: z.ZodUnknown;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'tool_result'>;
        toolCallId: z.ZodString;
        content: z.ZodString;
        isError: z.ZodBoolean;
      },
      z.core.$strip
    >,
  ],
  'type'
>;
```

### LlmDelegateToolCallsConfigSchema

Zod schema for `llm_delegate_tool_calls` tool config (result persistence options).

```ts
import { LlmDelegateToolCallsConfigSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmDelegateToolCallsConfigSchema: z.ZodObject<
  {
    save: z.ZodOptional<z.ZodBoolean>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  z.core.$strip
>;
```

### LlmDelegateToolCallsToolSchema

Zod schema for `llm_delegate_tool_calls` tool args (the LLM `message` and the
`callback.transition` to fire on completion).

```ts
import { LlmDelegateToolCallsToolSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmDelegateToolCallsToolSchema: z.ZodObject<
  {
    message: z.ZodObject<
      {
        role: z.ZodEnum<{
          user: 'user';
          assistant: 'assistant';
        }>;
        blocks: z.ZodOptional<
          z.ZodArray<
            z.ZodDiscriminatedUnion<
              [
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'text'>;
                    text: z.ZodString;
                  },
                  z.core.$strip
                >,
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'thinking'>;
                    text: z.ZodString;
                  },
                  z.core.$strip
                >,
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'tool_call'>;
                    id: z.ZodString;
                    name: z.ZodString;
                    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                  },
                  z.core.$strip
                >,
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'server_tool_use'>;
                    id: z.ZodString;
                    name: z.ZodString;
                    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                  },
                  z.core.$strip
                >,
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'server_tool_result'>;
                    toolUseId: z.ZodString;
                    content: z.ZodUnknown;
                  },
                  z.core.$strip
                >,
                z.ZodObject<
                  {
                    type: z.ZodLiteral<'tool_result'>;
                    toolCallId: z.ZodString;
                    content: z.ZodString;
                    isError: z.ZodBoolean;
                  },
                  z.core.$strip
                >,
              ],
              'type'
            >
          >
        >;
        id: z.ZodOptional<z.ZodString>;
        text: z.ZodString;
        stopReason: z.ZodOptional<
          z.ZodEnum<{
            end_turn: 'end_turn';
            tool_use: 'tool_use';
            max_tokens: 'max_tokens';
            stop_sequence: 'stop_sequence';
          }>
        >;
      },
      z.core.$strip
    >;
    callback: z.ZodObject<
      {
        transition: z.ZodString;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
```

### LlmGenerateObjectArgsSchema

Zod schema for `llm_generate_object` tool args (`prompt`/`messages` plus the
`outputSchema` the result must conform to).

```ts
import { LlmGenerateObjectArgsSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmGenerateObjectArgsSchema: z.ZodObject<
  {
    prompt: z.ZodOptional<z.ZodString>;
    messages: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            role: z.ZodEnum<{
              user: 'user';
              assistant: 'assistant';
            }>;
            content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodAny>]>;
          },
          z.core.$strip
        >
      >
    >;
    outputSchema: z.ZodCustom<
      z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>,
      z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>
    >;
  },
  z.core.$strip
>;
```

### LlmGenerateObjectConfigSchema

Zod schema for `llm_generate_object` tool config (`provider`, `model`, `system`,
`providerConfig`).

```ts
import { LlmGenerateObjectConfigSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmGenerateObjectConfigSchema: z.ZodObject<
  {
    provider: z.ZodOptional<z.ZodString>;
    system: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    messagesSearchTag: z.ZodOptional<z.ZodString>;
    providerConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  z.core.$strip
>;
```

### LlmGenerateTextArgsSchema

Zod schema for `llm_generate_text` tool args (`prompt` and/or `messages`).

```ts
import { LlmGenerateTextArgsSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmGenerateTextArgsSchema: z.ZodObject<
  {
    prompt: z.ZodOptional<z.ZodString>;
    messages: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            role: z.ZodEnum<{
              user: 'user';
              assistant: 'assistant';
            }>;
            content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodAny>]>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
```

### LlmGenerateTextConfigSchema

Zod schema for `llm_generate_text` tool config (`provider`, `model`, `system`,
`tools`, `providerConfig`, and persistence options).

```ts
import { LlmGenerateTextConfigSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmGenerateTextConfigSchema: z.ZodObject<
  {
    provider: z.ZodOptional<z.ZodString>;
    system: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    messagesSearchTag: z.ZodOptional<z.ZodString>;
    providerConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    tools: z.ZodOptional<z.ZodArray<z.ZodString>>;
    save: z.ZodOptional<z.ZodBoolean>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  z.core.$strip
>;
```

### LlmNormalizedMessageSchema

Zod schema for a normalized LLM message, with optional `id`, `text`, structured
blocks, and `stopReason`.

```ts
import { LlmNormalizedMessageSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmNormalizedMessageSchema: z.ZodObject<
  {
    role: z.ZodEnum<{
      user: 'user';
      assistant: 'assistant';
    }>;
    blocks: z.ZodOptional<
      z.ZodArray<
        z.ZodDiscriminatedUnion<
          [
            z.ZodObject<
              {
                type: z.ZodLiteral<'text'>;
                text: z.ZodString;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                type: z.ZodLiteral<'thinking'>;
                text: z.ZodString;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                type: z.ZodLiteral<'tool_call'>;
                id: z.ZodString;
                name: z.ZodString;
                args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                type: z.ZodLiteral<'server_tool_use'>;
                id: z.ZodString;
                name: z.ZodString;
                input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                type: z.ZodLiteral<'server_tool_result'>;
                toolUseId: z.ZodString;
                content: z.ZodUnknown;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                type: z.ZodLiteral<'tool_result'>;
                toolCallId: z.ZodString;
                content: z.ZodString;
                isError: z.ZodBoolean;
              },
              z.core.$strip
            >,
          ],
          'type'
        >
      >
    >;
    id: z.ZodOptional<z.ZodString>;
    text: z.ZodString;
    stopReason: z.ZodOptional<
      z.ZodEnum<{
        end_turn: 'end_turn';
        tool_use: 'tool_use';
        max_tokens: 'max_tokens';
        stop_sequence: 'stop_sequence';
      }>
    >;
  },
  z.core.$strip
>;
```

### LlmUpdateToolResultConfigSchema

Zod schema for `llm_update_tool_result` tool config (result persistence options).

```ts
import { LlmUpdateToolResultConfigSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmUpdateToolResultConfigSchema: z.ZodObject<
  {
    save: z.ZodOptional<z.ZodBoolean>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  z.core.$strip
>;
```

### LlmUpdateToolResultToolSchema

Zod schema for `llm_update_tool_result` tool args (the pending `delegateResult`
and the `completedTool` to merge in).

```ts
import { LlmUpdateToolResultToolSchema } from '@loopstack/llm-provider-module';
```

```ts
LlmUpdateToolResultToolSchema: z.ZodObject<
  {
    delegateResult: z.ZodObject<
      {
        allCompleted: z.ZodBoolean;
        toolResults: z.ZodArray<z.ZodAny>;
        pendingCount: z.ZodNumber;
        errorCount: z.ZodOptional<z.ZodNumber>;
        hasErrors: z.ZodOptional<z.ZodBoolean>;
        errors: z.ZodOptional<z.ZodArray<z.ZodAny>>;
      },
      z.core.$strip
    >;
    completedTool: z.ZodAny;
  },
  z.core.$strip
>;
```
