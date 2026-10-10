---
title: 'API: @loopstack/openai'
description: 'Public API reference for @loopstack/openai'
includeInLlmsFullTxt: false
---

# API: @loopstack/openai

## Classes

### OpenAiModule

NestJS module that provides the OpenAI LLM provider (`OpenAiLlmProvider`, registered under provider id `openai`) and the `OpenAiClientService`.

Registration:

- `OpenAiModule` — bare import is all that is needed; there are no static methods. On startup the provider registers itself into the LLM provider registry, after which `openai` can be selected as a provider in LLM tools and workflows.

Requires: must be co-imported with `LlmProviderModule`, which supplies the `LlmProviderRegistry` the provider registers into; and an OpenAI API key, read from the `OPENAI_API_KEY` env var by default (override the env var name per call via `envApiKey`).

```ts
import { OpenAiModule } from '@loopstack/openai';
```

```ts
export class OpenAiModule {}
```

## Interfaces

### OpenAiProviderConfig

Provider-specific configuration for the OpenAI LLM provider.
Passed via `providerConfig` in LlmGenerateTextArgs / LlmGenerateObjectArgs.

```ts
import { OpenAiProviderConfig } from '@loopstack/openai';
```

```ts
export interface OpenAiProviderConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  envApiKey?: string;
}
```
