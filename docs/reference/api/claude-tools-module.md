---
title: 'API: @loopstack/claude-tools-module'
description: 'Public API reference for @loopstack/claude-tools-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/claude-tools-module

## Classes

### ClaudeToolsModule

NestJS module that provides Claude-specific workflow tools that consume the LLM provider — currently the `ClaudeWebSearchStepTool` workflow step (`claude_web_search_step`), which runs a web search as its own Claude request through `claude_native_web_search`.

Registration:

- `ClaudeToolsModule` — bare import registers the tool providers; use this when `LlmProviderModule` is already configured elsewhere in the app and you just want the tools available.
- `ClaudeToolsModule.forFeature(config: { llm: LlmModuleConfig })` — use to scope the LLM provider/model configuration for these tools; it imports `LlmProviderModule.forFeature(config.llm)` alongside the providers.

Requires: `LlmProviderModule` must be available (it supplies the `LlmGenerateTextTool` the tool injects) — either configured app-wide or via `forFeature`; and a registered Claude provider (import `ClaudeModule`) with a valid `ANTHROPIC_API_KEY`, since the search executes through the `claude` provider.

```ts
import { ClaudeToolsModule } from '@loopstack/claude-tools-module';
```

```ts
export class ClaudeToolsModule {
  static forFeature(config: { llm: LlmModuleConfig }): DynamicModule;
}
```

### ClaudeWebSearchStepTool

Workflow step that runs a web search as its own Claude request, returning search hits and model commentary. The request uses `claude_native_web_search`, and its reply is not saved to the conversation. To give an agent web search, list `claude_native_web_search` in its `tools` instead — attaching this tool to an agent costs a second LLM call per search.

```ts
import { ClaudeWebSearchStepTool } from '@loopstack/claude-tools-module';
```

**Provided by:** `ClaudeToolsModule`

```ts
export class ClaudeWebSearchStepTool extends BaseTool<
  ClaudeWebSearchStepArgs,
  ClaudeWebSearchStepConfig,
  WebSearchResult
> {
  protected handle(
    args: ClaudeWebSearchStepArgs,
    ctx: RunContext,
    options?: ToolCallOptions<ClaudeWebSearchStepConfig>,
  ): Promise<ToolEnvelope<WebSearchResult>>;
}
```

## Interfaces

### WebSearchHit

A single web search hit (title + URL) returned by `ClaudeWebSearchStepTool`.

```ts
import { WebSearchHit } from '@loopstack/claude-tools-module';
```

```ts
export interface WebSearchHit {
  title: string;
  url: string;
}
```

### WebSearchResult

Result for `ClaudeWebSearchStepTool` — the query, interleaved hit blocks and text commentary, a sources reminder, and timing.

```ts
import { WebSearchResult } from '@loopstack/claude-tools-module';
```

```ts
export interface WebSearchResult {
  query: string;
  results: Array<WebSearchResultBlock | string>;
  sourcesReminder: string;
  durationSeconds: number;
}
```

### WebSearchResultBlock

A block of web search hits tied to a single server tool use, returned by `ClaudeWebSearchStepTool`.

```ts
import { WebSearchResultBlock } from '@loopstack/claude-tools-module';
```

```ts
export interface WebSearchResultBlock {
  tool_use_id: string;
  content: WebSearchHit[];
}
```

## Type Aliases

### ClaudeWebSearchStepArgs

Args for `ClaudeWebSearchStepTool`.

```ts
import { ClaudeWebSearchStepArgs } from '@loopstack/claude-tools-module';
```

```ts
export type ClaudeWebSearchStepArgs = z.infer<typeof ClaudeWebSearchStepArgsSchema>;
```

### ClaudeWebSearchStepConfig

Config for `ClaudeWebSearchStepTool`.

```ts
import { ClaudeWebSearchStepConfig } from '@loopstack/claude-tools-module';
```

```ts
export type ClaudeWebSearchStepConfig = z.infer<typeof ClaudeWebSearchStepConfigSchema>;
```

## Variables

### ClaudeWebSearchStepArgsSchema

Zod schema for `ClaudeWebSearchStepTool` arguments.

```ts
import { ClaudeWebSearchStepArgsSchema } from '@loopstack/claude-tools-module';
```

```ts
ClaudeWebSearchStepArgsSchema: z.ZodObject<
  {
    query: z.ZodString;
  },
  z.core.$strict
>;
```

### ClaudeWebSearchStepConfigSchema

Zod schema for `ClaudeWebSearchStepTool` configuration.

```ts
import { ClaudeWebSearchStepConfigSchema } from '@loopstack/claude-tools-module';
```

```ts
ClaudeWebSearchStepConfigSchema: z.ZodObject<
  {
    model: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    envApiKey: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
```

### WebSearchHitSchema

Zod schema for `WebSearchHit`.

```ts
import { WebSearchHitSchema } from '@loopstack/claude-tools-module';
```

```ts
WebSearchHitSchema: z.ZodObject<
  {
    title: z.ZodString;
    url: z.ZodString;
  },
  z.core.$strict
>;
```

### WebSearchResultBlockSchema

Zod schema for `WebSearchResultBlock`.

```ts
import { WebSearchResultBlockSchema } from '@loopstack/claude-tools-module';
```

```ts
WebSearchResultBlockSchema: z.ZodObject<
  {
    tool_use_id: z.ZodString;
    content: z.ZodArray<
      z.ZodObject<
        {
          title: z.ZodString;
          url: z.ZodString;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### WebSearchResultSchema

Zod schema for `WebSearchResult` — the `resultSchema` of `claude_web_search_step`.

```ts
import { WebSearchResultSchema } from '@loopstack/claude-tools-module';
```

```ts
WebSearchResultSchema: z.ZodObject<
  {
    query: z.ZodString;
    results: z.ZodArray<
      z.ZodUnion<
        readonly [
          z.ZodObject<
            {
              tool_use_id: z.ZodString;
              content: z.ZodArray<
                z.ZodObject<
                  {
                    title: z.ZodString;
                    url: z.ZodString;
                  },
                  z.core.$strict
                >
              >;
            },
            z.core.$strict
          >,
          z.ZodString,
        ]
      >
    >;
    sourcesReminder: z.ZodString;
    durationSeconds: z.ZodNumber;
  },
  z.core.$strict
>;
```
