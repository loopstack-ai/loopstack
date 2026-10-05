---
title: 'API: @loopstack/web-module'
description: 'Public API reference for @loopstack/web-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/web-module

## Classes

### WebFetchTool

Tool that fetches a URL, converts HTML to Markdown, and optionally summarizes the content through the configured
LLM provider (model `claude-haiku-4-5-20251001` by default). A summarized result carries the provider, model and token usage as `LlmResultMeta`.

```ts
import { WebFetchTool } from '@loopstack/web-module';
```

**Provided by:** `WebModule`

```ts
export class WebFetchTool extends BaseTool<WebFetchArgs, object, WebFetchResult, Partial<LlmResultMeta>> {
  protected handle(args: WebFetchArgs, ctx: RunContext): Promise<ToolEnvelope<WebFetchResult, Partial<LlmResultMeta>>>;
}
```

### WebModule

NestJS module that provides the `web_fetch` tool (`WebFetchTool`) and its supporting services —
fetches a URL, converts HTML to Markdown, and optionally summarizes the content with the configured LLM provider.

Registration:

- `WebModule` — bare import; registers the `WebFetchTool` and the fetcher, Markdown, and summarizer
  services. There are no static configuration methods.

Requires: `LlmProviderModule` imported alongside it (the summarizer resolves its provider from the
global `LlmProviderRegistry`). The optional summarization step (triggered when a `prompt` arg is
passed) also needs a provider module such as `ClaudeModule` or `OpenAiModule` and its API key. It
uses the tool's `provider` arg, else the `LlmProviderModule` default provider, else `claude`, and
the tool's `model` arg, else `CLAUDE_WEB_FETCH_MODEL`, else `claude-haiku-4-5-20251001` — pass `model`
when summarizing with a provider other than `claude`.

```ts
import { WebModule } from '@loopstack/web-module';
```

```ts
export class WebModule {}
```

## Interfaces

### WebFetchResult

Result for `WebFetchTool` — the fetched URL, response metadata, the Markdown or summarized content, and optional redirect details.

```ts
import { WebFetchResult } from '@loopstack/web-module';
```

```ts
export interface WebFetchResult {
  url: string;
  bytes: number;
  code: number;
  codeText: string;
  contentType: string;
  result: string;
  truncated: boolean;
  cached: boolean;
  durationMs: number;
  redirect?: {
    originalUrl: string;
    redirectUrl: string;
    statusCode: number;
  };
}
```

## Type Aliases

### WebFetchArgs

Args for `WebFetchTool`.

```ts
import { WebFetchArgs } from '@loopstack/web-module';
```

```ts
export type WebFetchArgs = z.infer<typeof WebFetchSchema>;
```

## Variables

### WebFetchResultSchema

Zod schema for `WebFetchResult`.

```ts
import { WebFetchResultSchema } from '@loopstack/web-module';
```

```ts
WebFetchResultSchema: z.ZodObject<
  {
    url: z.ZodString;
    bytes: z.ZodNumber;
    code: z.ZodNumber;
    codeText: z.ZodString;
    contentType: z.ZodString;
    result: z.ZodString;
    truncated: z.ZodBoolean;
    cached: z.ZodBoolean;
    durationMs: z.ZodNumber;
    redirect: z.ZodOptional<
      z.ZodObject<
        {
          originalUrl: z.ZodString;
          redirectUrl: z.ZodString;
          statusCode: z.ZodNumber;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### WebFetchSchema

Zod schema for `WebFetchTool` arguments.

```ts
import { WebFetchSchema } from '@loopstack/web-module';
```

```ts
WebFetchSchema: z.ZodObject<
  {
    url: z.ZodURL;
    prompt: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    envApiKey: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strict
>;
```
