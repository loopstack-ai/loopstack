---
title: OpenAI Module
description: OpenAI LLM provider for the Loopstack automation framework. Implements LlmProviderInterface with the OpenAI SDK.
---

# @loopstack/openai

## Installation

```sh
npm install @loopstack/openai
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { OpenAiModule } from '@loopstack/openai';

@Module({
  imports: [OpenAiModule],
})
export class AppModule {}
```

`OpenAiModule` registers the `openai` provider into the LLM provider registry on startup, so import it alongside `LlmProviderModule` (from `@loopstack/llm-provider`).

The module reads the OpenAI API key from the `OPENAI_API_KEY` environment variable:

```env
OPENAI_API_KEY=sk-...
```
