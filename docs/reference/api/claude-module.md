---
title: API: @loopstack/claude-module
description: Public API reference for @loopstack/claude-module
includeInLlmsFullTxt: false
---

# API: @loopstack/claude-module

## Classes

### ClaudeModule

NestJS module that provides the Claude LLM provider (`ClaudeLlmProvider`, registered under provider id `claude`), the `ClaudeClientService`, and the `ClaudeWebSearchServerTool` server tool.

Registration:

- `ClaudeModule` — bare import is all that is needed; there are no static methods. On startup the provider registers itself into the LLM provider registry, after which `claude` can be selected as a provider in LLM tools and workflows.

Requires: must be co-imported with `LlmProviderModule`, which supplies the `LlmProviderRegistry` the provider registers into; and an Anthropic API key, read from the `ANTHROPIC_API_KEY` env var by default (override the env var name per call via `envApiKey`).

```ts
import { ClaudeModule } from '@loopstack/claude-module';
```

```ts
export class ClaudeModule {}
```

### ClaudeWebSearchServerTool

Tool that runs Claude's built-in server-side web search for real-time information retrieval during agent conversations.

```ts
import { ClaudeWebSearchServerTool } from '@loopstack/claude-module';
```

**Provided by:** `ClaudeModule`

```ts
export class ClaudeWebSearchServerTool extends ServerTool<ClaudeWebSearchServerToolConfig> {
  toServerToolConfig(config?: ClaudeWebSearchServerToolConfig): unknown;
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

### ClaudeWebSearchServerToolConfig

Config for `ClaudeWebSearchServerTool`.

```ts
import { ClaudeWebSearchServerToolConfig } from '@loopstack/claude-module';
```

```ts
export type ClaudeWebSearchServerToolConfig = z.infer<typeof ClaudeWebSearchServerToolConfigSchema>;
```

## Variables

### ClaudeWebSearchServerToolConfigSchema

Zod schema for `ClaudeWebSearchServerTool` configuration.

```ts
import { ClaudeWebSearchServerToolConfigSchema } from '@loopstack/claude-module';
```

```ts
ClaudeWebSearchServerToolConfigSchema: z.ZodObject<
  {
    maxUses: z.ZodDefault<z.ZodNumber>;
    allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    blockedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
```
