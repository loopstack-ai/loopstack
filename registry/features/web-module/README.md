---
title: Web Module
description: Fetch and process web content. Converts HTML to Markdown, optionally summarizes against a prompt via the configured LLM provider, with URL validation, same-origin redirect handling, LRU caching, and a preapproved-host allowlist.
---

# @loopstack/web-module

## Installation

```sh
npm install @loopstack/web-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { WebModule } from '@loopstack/web-module';

@Module({
  imports: [LlmProviderModule, ClaudeModule, WebModule],
})
export class AppModule {}
```

The optional summarization step (triggered when a `prompt` arg is passed to the tool) runs through the LLM provider layer: the tool's `provider` arg, else the `LlmProviderModule` default provider, else `claude`. The model is the tool's `model` arg, else `CLAUDE_WEB_FETCH_MODEL`, else `claude-haiku-4-5-20251001` — pass `model` when summarizing with a provider other than `claude`. The step needs that provider's API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

A summarized result returns the provider, model and token usage as `LlmResultMeta` metadata, which `@loopstack/quota` charges to the `llm-cost` quota.
