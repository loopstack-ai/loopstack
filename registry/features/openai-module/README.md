---
title: OpenAI Module
description: OpenAI LLM provider for the Loopstack automation framework. Implements LlmProviderInterface with the OpenAI SDK.
---

# @loopstack/openai-module

## Installation

```sh
npm install @loopstack/openai-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { OpenAiModule } from '@loopstack/openai-module';

@Module({
  imports: [OpenAiModule],
})
export class AppModule {}
```

`OpenAiModule` registers the `openai` provider into the LLM provider registry on startup, so import it alongside `LlmProviderModule` (from `@loopstack/llm-provider-module`).

The module reads the OpenAI API key from the `OPENAI_API_KEY` environment variable:

```env
OPENAI_API_KEY=sk-...
```
