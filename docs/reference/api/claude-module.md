---
title: 'API: @loopstack/claude-module'
description: 'Public API reference for @loopstack/claude-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/claude-module

## Classes

### ClaudeModule

NestJS module that provides the Claude LLM provider (`ClaudeLlmProvider`, registered under provider id `claude`), the `ClaudeClientService`, and the `ClaudeNativeWebSearchTool` server tool.

Registration:

- `ClaudeModule` — bare import is all that is needed; there are no static methods. On startup the provider registers itself into the LLM provider registry, after which `claude` can be selected as a provider in LLM tools and workflows.

Requires: must be co-imported with `LlmProviderModule`, which supplies the `LlmProviderRegistry` the provider registers into; and an Anthropic API key, read from the `ANTHROPIC_API_KEY` env var by default (override the env var name per call via `envApiKey`).

```ts
import { ClaudeModule } from '@loopstack/claude-module';
```

```ts
export class ClaudeModule {}
```

### ClaudeNativeWebSearchTool

Claude's provider-native web search. List it in an LLM call's `tools` (an agent or `llm_generate_text`) and
Claude runs the search inside that same call. It is not callable from workflow code — for a standalone search
step, use `ClaudeWebSearchStepTool` (`claude_web_search_step`) from `@loopstack/claude-tools-module`.

```ts
import { ClaudeNativeWebSearchTool } from '@loopstack/claude-module';
```

**Provided by:** `ClaudeModule`

```ts
export class ClaudeNativeWebSearchTool extends ServerTool<ClaudeNativeWebSearchToolConfig> {
  toServerToolConfig(config?: ClaudeNativeWebSearchToolConfig): unknown;
}
```

## Interfaces

### ClaudeProviderConfig

Provider-specific configuration for the Claude LLM provider.
Passed via `providerConfig` in LlmGenerateTextArgs / LlmGenerateObjectArgs.

```ts
import { ClaudeProviderConfig } from '@loopstack/claude-module';
```

```ts
export interface ClaudeProviderConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  cache?: boolean;
  envApiKey?: string;
}
```

## Type Aliases

### ClaudeNativeWebSearchToolConfig

Config for `ClaudeNativeWebSearchTool`.

```ts
import { ClaudeNativeWebSearchToolConfig } from '@loopstack/claude-module';
```

```ts
export type ClaudeNativeWebSearchToolConfig = z.infer<typeof ClaudeNativeWebSearchToolConfigSchema>;
```

## Variables

### ClaudeNativeWebSearchToolConfigSchema

Zod schema for `ClaudeNativeWebSearchTool` configuration.

```ts
import { ClaudeNativeWebSearchToolConfigSchema } from '@loopstack/claude-module';
```

```ts
ClaudeNativeWebSearchToolConfigSchema: z.ZodObject<
  {
    maxUses: z.ZodDefault<z.ZodNumber>;
    allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    blockedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
```
