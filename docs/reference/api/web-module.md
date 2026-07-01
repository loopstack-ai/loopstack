---
title: API: @loopstack/web-module
description: Public API reference for @loopstack/web-module
includeInLlmsFullTxt: false
---

# API: @loopstack/web-module

## Classes

### WebFetchTool

Tool that fetches a URL, converts HTML to Markdown, and optionally summarizes the content with a small Claude model.

```ts
import { WebFetchTool } from '@loopstack/web-module';
```

**Provided by:** `WebModule`

```ts
export class WebFetchTool extends BaseTool<WebFetchArgs, object, WebFetchResult> {
  protected handle(args: WebFetchArgs): Promise<ToolEnvelope<WebFetchResult>>;
}
```

### WebModule

NestJS module that provides the `web_fetch` tool (`WebFetchTool`) and its supporting services —
fetches a URL, converts HTML to Markdown, and optionally summarizes the content with Claude.

Registration:

- `WebModule` — bare import; registers the `WebFetchTool` and the fetcher, Markdown, and summarizer
  services. There are no static configuration methods.

Requires: nothing beyond importing the module for plain fetch-and-convert use. The optional
summarization step (triggered when a `prompt` arg is passed) runs through the co-imported
`ClaudeModule` and needs an Anthropic API key — read from `ANTHROPIC_API_KEY` by default, overridable
per call via the tool's `envApiKey` arg.

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
    model: z.ZodOptional<z.ZodString>;
    envApiKey: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strict
>;
```
