---
title: API: @loopstack/claude-tools-module
description: Public API reference for @loopstack/claude-tools-module
includeInLlmsFullTxt: false
---

# API: @loopstack/claude-tools-module

## Classes

### ClaudeToolsModule

NestJS module that provides Claude-specific workflow tools that consume the LLM provider — currently the `ClaudeWebSearch` tool (`claude_web_search`), which runs a web search through the `claude` provider's built-in `web_search` server tool.

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

### ClaudeWebSearch

Tool that runs a web search through the Claude provider's built-in `web_search` server tool, returning search hits and model commentary.

```ts
import { ClaudeWebSearch } from '@loopstack/claude-tools-module';
```

**Provided by:** `ClaudeToolsModule`

```ts
export class ClaudeWebSearch extends BaseTool<ClaudeWebSearchArgs, ClaudeWebSearchConfig, WebSearchResult> {
  protected handle(
    args: ClaudeWebSearchArgs,
    ctx: RunContext,
    options?: ToolCallOptions<ClaudeWebSearchConfig>,
  ): Promise<ToolEnvelope<WebSearchResult>>;
}
```

## Interfaces

### WebSearchHit

A single web search hit (title + URL) returned by `ClaudeWebSearch`.

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

Result for `ClaudeWebSearch` — the query, interleaved hit blocks and text commentary, a sources reminder, and timing.

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

A block of web search hits tied to a single server tool use, returned by `ClaudeWebSearch`.

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

### ClaudeWebSearchArgs

Args for `ClaudeWebSearch`.

```ts
import { ClaudeWebSearchArgs } from '@loopstack/claude-tools-module';
```

```ts
export type ClaudeWebSearchArgs = z.infer<typeof ClaudeWebSearchArgsSchema>;
```

### ClaudeWebSearchConfig

Config for `ClaudeWebSearch`.

```ts
import { ClaudeWebSearchConfig } from '@loopstack/claude-tools-module';
```

```ts
export type ClaudeWebSearchConfig = z.infer<typeof ClaudeWebSearchConfigSchema>;
```

## Variables

### ClaudeWebSearchArgsSchema

Zod schema for `ClaudeWebSearch` arguments.

```ts
import { ClaudeWebSearchArgsSchema } from '@loopstack/claude-tools-module';
```

```ts
ClaudeWebSearchArgsSchema: z.ZodObject<
  {
    query: z.ZodString;
  },
  z.core.$strict
>;
```

### ClaudeWebSearchConfigSchema

Zod schema for `ClaudeWebSearch` configuration.

```ts
import { ClaudeWebSearchConfigSchema } from '@loopstack/claude-tools-module';
```

```ts
ClaudeWebSearchConfigSchema: z.ZodObject<
  {
    model: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    envApiKey: z.ZodOptional<z.ZodString>;
    cache: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
```
