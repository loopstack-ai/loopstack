---
title: Web Module
description: Fetch and process web content. Converts HTML to Markdown, optionally summarizes against a prompt via Claude, with URL validation, same-origin redirect handling, LRU caching, and a preapproved-host allowlist.
---

# @loopstack/web-module

## Installation

```sh
npm install @loopstack/web-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { WebModule } from '@loopstack/web-module';

@Module({
  imports: [WebModule],
})
export class AppModule {}
```

Plain fetch-and-convert use needs no configuration. The optional summarization step (triggered when a `prompt` arg is passed to the tool) runs through Claude and requires an Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```
