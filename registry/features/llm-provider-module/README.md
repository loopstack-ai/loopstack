---
title: LLM Provider Module
description: Shared LLM provider contracts, registry, and helper services for the Loopstack automation framework. Provider modules (Claude, OpenAI, etc.) implement the LlmProviderInterface and register themselves at module init.
---

# @loopstack/llm-provider-module

## Installation

```sh
npm install @loopstack/llm-provider-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';

@Module({
  imports: [LlmProviderModule],
})
export class AppModule {}
```

Pair it with at least one provider module (e.g. `ClaudeModule` from `@loopstack/claude-module` or `OpenAiModule` from `@loopstack/openai-module`) — this module holds the registry, the provider modules populate it.

To set an app-wide default provider and model, use `forRoot()` instead of the bare import; `forFeature()` overrides the config for one module's tools:

```ts
LlmProviderModule.forRoot({ provider: 'claude', model: 'claude-sonnet-4-5' });
```
