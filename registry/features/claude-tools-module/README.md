---
title: Claude Tools Module
description: Claude-specific tools that consume the LLM provider (e.g. web search using Claude server tools).
---

# @loopstack/claude-tools-module

## Installation

```sh
npm install @loopstack/claude-tools-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { ClaudeToolsModule } from '@loopstack/claude-tools-module';

@Module({
  imports: [ClaudeToolsModule],
})
export class AppModule {}
```

`ClaudeToolsModule` requires `LlmProviderModule` to be available in the app and a registered Claude provider (import `ClaudeModule` alongside it), since the tools execute through the `claude` provider — make sure `ANTHROPIC_API_KEY` is set:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

To scope the LLM provider/model configuration for these tools, use `forFeature()` instead of the bare import:

```ts
ClaudeToolsModule.forFeature({ llm: { model: 'claude-sonnet-4-5' } });
```
