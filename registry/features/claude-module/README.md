---
title: Claude Module
description: A collection of tools for performing AI actions using the Anthropic Claude API directly via the official SDK.
---

# @loopstack/claude-module

## Installation

```sh
npm install @loopstack/claude-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';

@Module({
  imports: [ClaudeModule],
})
export class AppModule {}
```

`ClaudeModule` registers the `claude` provider into the LLM provider registry on startup, so import it alongside `LlmProviderModule` (from `@loopstack/llm-provider-module`).

The module reads the Anthropic API key from the `ANTHROPIC_API_KEY` environment variable:

```env
ANTHROPIC_API_KEY=sk-ant-...
```
