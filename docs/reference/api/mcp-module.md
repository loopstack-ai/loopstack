---
title: API: @loopstack/mcp-module
description: Public API reference for @loopstack/mcp-module
includeInLlmsFullTxt: false
---

# API: @loopstack/mcp-module

## Classes

### McpAuthError

Error thrown when the remote MCP server responds with 401 or 403.
Catch this to handle missing or invalid authentication credentials.

```ts
import { McpAuthError } from '@loopstack/mcp-module';
```

```ts
export class McpAuthError extends McpError {}
```

### McpCallTool

Tool that calls a tool on a remote MCP server over HTTPS (Streamable HTTP or legacy SSE).

```ts
import { McpCallTool } from '@loopstack/mcp-module';
```

**Provided by:** `McpModule`

```ts
export class McpCallTool extends McpToolBase<McpCallToolArgs> {
  protected handle(
    args: McpCallToolArgs,
    ctx: RunContext,
    options?: ToolCallOptions<McpToolConfig>,
  ): Promise<ToolEnvelope>;
}
```

### McpClientService

Service that connects to remote MCP servers; inject it to list and call tools on an MCP endpoint.

```ts
import { McpClientService } from '@loopstack/mcp-module';
```

**Provided by:** `McpModule`

```ts
export class McpClientService {
  constructor(env?: EnvReader, metrics?: McpMetricsPort);
  listTools(
    rawUrl: string,
    config: McpToolConfig,
    options?: McpClientCallOptions,
  ): Promise<{
    tools: unknown;
  }>;
  callTool(
    rawUrl: string,
    config: McpToolConfig,
    toolName: string,
    toolArgs: Record<string, unknown>,
    options?: McpClientCallOptions,
  ): Promise<McpCallToolResult>;
  mergeHeaders(config: McpToolConfig, url: URL): Record<string, string>;
}
```

### McpError

Base class for all MCP failures.
Catch this to handle any error raised while connecting to or calling a remote MCP server.

```ts
import { McpError } from '@loopstack/mcp-module';
```

```ts
export abstract class McpError extends Error {
  constructor(message: string);
}
```

### McpListToolsTool

Tool that lists the tool definitions exposed by a remote MCP server.

```ts
import { McpListToolsTool } from '@loopstack/mcp-module';
```

**Provided by:** `McpModule`

```ts
export class McpListToolsTool extends McpToolBase<McpListToolsArgs> {
  protected handle(
    args: McpListToolsArgs,
    ctx: RunContext,
    options?: ToolCallOptions<McpToolConfig>,
  ): Promise<ToolEnvelope>;
}
```

### McpModule

NestJS module that provides remote MCP client tools — `mcp_list_tools` (`McpListToolsTool`),
`mcp_call` (`McpCallTool`), and the `McpClientService` that connects to remote Model Context
Protocol servers.

Registration:

- `McpModule.forRoot(McpToolConfigInput)` — the only entry point; registers the module globally and
  co-imports `LoopCoreModule`. Pass config (allowlist, auth header mappings) to apply it to every
  tool call; config is optional here, in which case each call must supply config via `options.config`.

Requires: an `allowedHosts` allowlist supplied either at the module level (via `forRoot`) or per call
via `options.config` — a tool call with no config at either level throws (the SSRF allowlist is
mandatory). For authenticated servers, the env vars referenced by `hostHeaderEnv` / `headerEnv` must
also be set, since header values are read from `process.env` at call time.

```ts
import { McpModule } from '@loopstack/mcp-module';
```

```ts
export class McpModule {
  static forRoot(config?: McpToolConfigInput): DynamicModule;
}
```

### McpProtocolError

Error thrown when the MCP server returns a malformed response (JSON-RPC parse or invalid message).
Catch this to handle protocol-level violations from the remote server.

```ts
import { McpProtocolError } from '@loopstack/mcp-module';
```

```ts
export class McpProtocolError extends McpError {}
```

### McpTimeoutError

Error thrown when an MCP call exceeds its configured `timeoutMs`.
Catch this to handle slow or unresponsive remote servers.

```ts
import { McpTimeoutError } from '@loopstack/mcp-module';
```

```ts
export class McpTimeoutError extends McpError {}
```

### McpToolBase

Abstract base for tools that call a remote MCP server; extend it to add custom MCP-backed tools.

Concrete subclasses must repeat the `@Tool({ schema, configSchema })` decorator —
decorator metadata is not inherited.

```ts
import { McpToolBase } from '@loopstack/mcp-module';
```

```ts
export abstract class McpToolBase<TArgs extends object> extends BaseTool<TArgs, McpToolConfig> {
  protected readonly mcp: McpClientService;
  protected requireConfig(config: McpToolConfig | undefined): McpToolConfig;
}
```

### McpTransportError

Error thrown on transport-level failures (DNS, TCP, TLS, abort, or transport fallback).
Catch this to handle network or connection problems reaching the remote server.

```ts
import { McpTransportError } from '@loopstack/mcp-module';
```

```ts
export class McpTransportError extends McpError {}
```

### McpUrlSecurityError

Error thrown when an MCP URL fails the security checks (SSRF, allowlist, scheme, or userinfo violations).
Catch this to react to a rejected or unsafe target URL.

```ts
import { McpUrlSecurityError } from '@loopstack/mcp-module';
```

```ts
export class McpUrlSecurityError extends McpError {}
```

## Interfaces

### McpClientCallOptions

Options for an `McpClientService` call (per-request timeout, transport, DNS-resolution skip).

```ts
import { McpClientCallOptions } from '@loopstack/mcp-module';
```

```ts
export interface McpClientCallOptions {
  timeoutMs?: number;
  skipDnsResolution?: boolean;
  transport?: McpTransportKind;
}
```

## Type Aliases

### McpCallToolArgs

Args for `McpCallTool` (`mcp_call`).

```ts
import { McpCallToolArgs } from '@loopstack/mcp-module';
```

```ts
export type McpCallToolArgs = z.infer<typeof McpCallToolArgsSchema>;
```

### McpCallToolResult

Result of an `McpClientService.callTool()` invocation — a modern call-tool result or a legacy tool result.

```ts
import { McpCallToolResult } from '@loopstack/mcp-module';
```

```ts
export type McpCallToolResult =
  | {
      kind: 'legacyToolResult';
      toolResult: unknown;
      meta?: unknown;
    }
  | {
      kind: 'callToolResult';
      content: unknown;
      structuredContent?: unknown;
      isError?: unknown;
      meta?: unknown;
    };
```

### McpConnectionArgs

Args for connecting to a remote MCP server, shared by the MCP tools.

```ts
import { McpConnectionArgs } from '@loopstack/mcp-module';
```

```ts
export type McpConnectionArgs = z.infer<typeof McpConnectionArgsSchema>;
```

### McpListToolsArgs

Args for `McpListToolsTool` (`mcp_list_tools`).

```ts
import { McpListToolsArgs } from '@loopstack/mcp-module';
```

```ts
export type McpListToolsArgs = z.infer<typeof McpListToolsArgsSchema>;
```

### McpToolConfig

Config for the MCP tools (`McpCallTool`, `McpListToolsTool`).

```ts
import { McpToolConfig } from '@loopstack/mcp-module';
```

```ts
export type McpToolConfig = z.infer<typeof McpToolConfigSchema>;
```

### McpToolConfigInput

Input config for `McpModule.forRoot()` (the pre-parse shape of `McpToolConfig`).

```ts
import { McpToolConfigInput } from '@loopstack/mcp-module';
```

```ts
export type McpToolConfigInput = z.input<typeof McpToolConfigSchema>;
```

### McpTransportKind

Transport used to reach a remote MCP server — Streamable HTTP or legacy SSE.

```ts
import { McpTransportKind } from '@loopstack/mcp-module';
```

```ts
export type McpTransportKind = 'streamableHttp' | 'sse';
```

## Variables

### McpCallToolArgsSchema

Zod schema for `mcp_call` tool arguments.

```ts
import { McpCallToolArgsSchema } from '@loopstack/mcp-module';
```

```ts
McpCallToolArgsSchema: z.ZodObject<
  {
    serverUrl: z.ZodURL;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    transport: z.ZodDefault<
      z.ZodOptional<
        z.ZodEnum<{
          streamableHttp: 'streamableHttp';
          sse: 'sse';
        }>
      >
    >;
    toolName: z.ZodString;
    arguments: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
  },
  z.core.$strict
>;
```

### McpConnectionArgsSchema

Zod schema for the connection arguments shared by the MCP tools (`serverUrl`, `timeoutMs`, `transport`).

```ts
import { McpConnectionArgsSchema } from '@loopstack/mcp-module';
```

```ts
McpConnectionArgsSchema: z.ZodObject<
  {
    serverUrl: z.ZodURL;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    transport: z.ZodDefault<
      z.ZodOptional<
        z.ZodEnum<{
          streamableHttp: 'streamableHttp';
          sse: 'sse';
        }>
      >
    >;
  },
  z.core.$strict
>;
```

### McpListToolsArgsSchema

Zod schema for `mcp_list_tools` tool arguments.

```ts
import { McpListToolsArgsSchema } from '@loopstack/mcp-module';
```

```ts
McpListToolsArgsSchema: z.ZodObject<
  {
    serverUrl: z.ZodURL;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    transport: z.ZodDefault<
      z.ZodOptional<
        z.ZodEnum<{
          streamableHttp: 'streamableHttp';
          sse: 'sse';
        }>
      >
    >;
  },
  z.core.$strict
>;
```

### McpToolConfigSchema

Zod schema for MCP tool configuration — host allowlist and auth header mappings.

```ts
import { McpToolConfigSchema } from '@loopstack/mcp-module';
```

```ts
McpToolConfigSchema: z.ZodObject<
  {
    allowedHosts: z.ZodArray<z.ZodString>;
    allowInsecureHttp: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    allowPrivateHosts: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    defaultHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    headerEnv: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    hostHeaderEnv: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>>>;
  },
  z.core.$strict
>;
```
