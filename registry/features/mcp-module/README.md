---
title: MCP Module
description: Remote MCP client tools for Loopstack — McpModule.forRoot(), McpCallTool (mcp_call), McpListToolsTool (mcp_list_tools), McpToolConfig with allowedHosts, hostHeaderEnv, SSRF allowlist, Streamable HTTP and SSE transports, McpClientService, error hierarchy, McpMetricsPort
---

# @loopstack/mcp-module

> Remote-MCP client module for the [Loopstack](https://loopstack.ai) automation framework.

Lets a Loopstack agent list and call tools on remote Model Context Protocol (MCP) servers over HTTPS — Streamable HTTP or legacy SSE — with a strict SSRF allowlist and zero-trust handling of authentication secrets.

## When to Use

- **Connect an agent to hosted MCP servers** (Linear, GitHub, internal tools) without writing custom tool wrappers for each API.
- **Dynamically discover remote tool schemas** at runtime via `mcp_list_tools`, then invoke them with `mcp_call`.
- **Reach multiple MCP servers from one workflow** — `serverUrl` is a per-call argument, so a single agent can hop between any allowlisted host.
- **Not an MCP server** — this module does not expose your workflows over MCP. It is a client only.

## Installation

```sh
npm install @loopstack/mcp-module
```

Register the module with `McpModule.forRoot()`:

```ts
import { Module } from '@nestjs/common';
import { McpModule } from '@loopstack/mcp-module';

@Module({
  imports: [
    McpModule.forRoot({
      allowedHosts: ['mcp.linear.app'],
      hostHeaderEnv: {
        'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
      },
    }),
  ],
})
export class AppModule {}
```

Set the corresponding env var. The value is sent raw — include `Bearer ` if the server expects it:

```env
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

## Quick Start

This example mirrors the `@loopstack/mcp-linear-example-workflow` package. It starts a `ChatAgentWorkflow` sub-workflow with both MCP tools available.

```ts
// mcp-linear.module.ts
import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { McpModule } from '@loopstack/mcp-module';
import { McpLinearWorkflow } from './mcp-linear.workflow';

@Module({
  imports: [
    McpModule.forRoot({
      allowedHosts: ['mcp.linear.app'],
      hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
    }),
    AgentModule,
  ],
  providers: [McpLinearWorkflow],
  exports: [McpLinearWorkflow],
})
export class McpLinearModule {}
```

```ts
// mcp-linear.workflow.ts
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { McpCallTool, McpListToolsTool } from '@loopstack/mcp-module';

const ArgsSchema = z.object({
  initialMessage: z.string().optional().default('List available Linear tools, then fetch my top 5 issues.'),
});

@Workflow({
  title: 'MCP Linear',
  description: 'Chat with an agent connected to Linear via MCP.',
  schema: ArgsSchema,
})
export class McpLinearWorkflow extends BaseWorkflow<z.infer<typeof ArgsSchema>> {
  constructor(
    private readonly chatAgentWorkflow: ChatAgentWorkflow,
    private readonly mcpListTools: McpListToolsTool,
    private readonly mcpCallTool: McpCallTool,
  ) {
    super();
  }

  @Transition({ to: 'chatting' })
  async startChat(
    state: Record<string, unknown>,
    ctx: RunContext<z.infer<typeof ArgsSchema>>,
  ): Promise<Record<string, unknown>> {
    await this.chatAgentWorkflow.run(
      {
        system: 'You are a Linear assistant. Use mcp_list_tools to discover tools, then mcp_call to invoke them.',
        tools: ['mcp_list_tools', 'mcp_call'],
        userMessage: ctx.args.initialMessage,
      },
      { show: 'inline', label: 'Linear Agent Chat' },
    );

    return state;
  }
}
```

Tools are referenced by their `@Tool({ name })` values (`'mcp_list_tools'`, `'mcp_call'`) and resolved from the NestJS DI container at runtime.

## How It Works

```
Agent LLM loop
  │
  ├─ mcp_list_tools(serverUrl, transport?)
  │     └─ McpClientService.listTools() → connect, list, disconnect
  │
  └─ mcp_call(serverUrl, toolName, arguments, transport?)
        └─ McpClientService.callTool() → connect, call, disconnect
```

Each tool call creates a fresh MCP client connection. Before any bytes go out, the URL passes through the security pipeline (allowlist, scheme, DNS resolution). Headers are merged from config and env vars are resolved at call time.

The agent decides which `serverUrl` and `toolName` to use per call, so a single workflow can reach any host in `allowedHosts`.

### Security Model

Every connection passes three checks:

1. **Allowlist** — `serverUrl`'s hostname must match `allowedHosts`. Exact match or `*.example.com` (which also matches `example.com`).
2. **Scheme** — `https://` by default; `http://` only if `allowInsecureHttp: true`.
3. **Public-IP resolution** — DNS (or a literal IP) must resolve to a routable public address. Loopback, RFC1918, link-local, ULA, and IPv4-mapped equivalents are rejected. Override with `allowPrivateHosts: true` for trusted local MCP proxies.

Userinfo in the URL (`https://user:pw@host/...`) is rejected — credentials must flow through headers.

### Authentication

Three knobs, in increasing specificity:

| Knob             | Use for                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `defaultHeaders` | Static, **non-secret** values (e.g. `X-Trace: on`). Sensitive header names like `Authorization` are rejected here. |
| `headerEnv`      | `header -> env-var` mapping applied to every host. Value is read from `process.env` at call time.                  |
| `hostHeaderEnv`  | `host -> { header -> env-var }`. Use `'*'` for all hosts. Host-specific entries override the wildcard.             |

Precedence (later wins): `defaultHeaders` -> `headerEnv` -> `hostHeaderEnv['*']` -> `hostHeaderEnv[hostname]`.

Header names are logged on connect (e.g. `headers=[Authorization]`); values never are. If a referenced env var is unset or empty, the header is silently omitted.

### Transport

| Server                    | Transport                  |
| ------------------------- | -------------------------- |
| Linear (`mcp.linear.app`) | `sse`                      |
| Most modern hosted MCP    | `streamableHttp` (default) |

Pass `transport: 'sse'` per call when needed.

### Multiple MCP Servers

`serverUrl` is a per-call argument. An agent can reach any host listed in `allowedHosts`. To add a new server:

1. Add its hostname to `allowedHosts`.
2. Add its auth mapping to `hostHeaderEnv`.
3. Set the corresponding env var.

Dynamic, end-user-driven server registration (paste any URL mid-chat) is deliberately not supported — the allowlist exists to prevent agents from being tricked into hitting internal hosts.

## Tools Reference

### `mcp_list_tools`

Lists tool definitions exposed by a remote MCP server.

**Class:** `McpListToolsTool`

| Arg         | Type                        | Required | Description                                                 |
| ----------- | --------------------------- | -------- | ----------------------------------------------------------- |
| `serverUrl` | `z.url()`                   | Yes      | MCP endpoint URL (https recommended).                       |
| `transport` | `'streamableHttp' \| 'sse'` | No       | Default `'streamableHttp'`. Use `'sse'` for legacy servers. |
| `timeoutMs` | `number` (1–900000)         | No       | Per-request timeout in milliseconds.                        |

**Config:** `McpToolConfig` (via `configSchema` / `options.config` / `McpModule.forRoot()`)

**Returns:** `{ data: { tools: unknown } }` — the MCP `tools/list` response.

### `mcp_call`

Calls a tool on a remote MCP server.

**Class:** `McpCallTool`

| Arg         | Type                        | Required | Description                                                 |
| ----------- | --------------------------- | -------- | ----------------------------------------------------------- |
| `serverUrl` | `z.url()`                   | Yes      | MCP endpoint URL (https recommended).                       |
| `toolName`  | `string`                    | Yes      | Name of the remote MCP tool to invoke.                      |
| `arguments` | `Record<string, unknown>`   | No       | JSON object passed to the tool. Defaults to `{}`.           |
| `transport` | `'streamableHttp' \| 'sse'` | No       | Default `'streamableHttp'`. Use `'sse'` for legacy servers. |
| `timeoutMs` | `number` (1–900000)         | No       | Per-request timeout in milliseconds.                        |

**Config:** `McpToolConfig` (via `configSchema` / `options.config` / `McpModule.forRoot()`)

**Returns:** `{ data: McpCallToolResult }` — either `{ kind: 'callToolResult', content, structuredContent?, isError? }` or `{ kind: 'legacyToolResult', toolResult }`.

## Configuration

### `McpModule.forRoot(config?)`

Registers the module globally. Config is optional — if omitted, each tool call must provide config via `options.config`.

| Option              | Type                                     | Default | Description                                                                                |
| ------------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `allowedHosts`      | `string[]`                               | —       | Required. Hostnames allowed for `serverUrl`. Use `*.example.com` for wildcard.             |
| `allowInsecureHttp` | `boolean`                                | `false` | Allow `http://` URLs.                                                                      |
| `allowPrivateHosts` | `boolean`                                | `false` | Skip public-IP DNS check. For trusted local MCP proxies only.                              |
| `defaultHeaders`    | `Record<string, string>`                 | —       | Static non-secret headers. Sensitive names (`Authorization`, `Cookie`, etc.) are rejected. |
| `headerEnv`         | `Record<string, string>`                 | —       | `headerName -> envVarName` applied to every host.                                          |
| `hostHeaderEnv`     | `Record<string, Record<string, string>>` | —       | `hostname -> { headerName -> envVarName }`. Use `'*'` for all hosts.                       |

### Per-call config override

Inject the tool and pass config via `options.config`:

```ts
await this.mcpCallTool.call(args, {
  config: {
    allowedHosts: ['mcp.linear.app'],
    hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
  },
});
```

Per-call config overrides `McpModule.forRoot()` defaults entirely. If no config is provided at either level, the tool throws.

### Provider tokens

| Token                | Default            | Description                                                                              |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `MCP_METRICS`        | `NoopMcpMetrics`   | Implement `McpMetricsPort` for OpenTelemetry or custom metrics.                          |
| `MCP_ENV_READER`     | `ProcessEnvReader` | Implement `EnvReader` to source secrets from a secrets manager instead of `process.env`. |
| `MCP_DEFAULT_CONFIG` | `null`             | Set by `McpModule.forRoot()`. Can also be provided manually.                             |

## Errors

All failures throw subclasses of `McpError`:

| Error class           | Cause                                            |
| --------------------- | ------------------------------------------------ |
| `McpUrlSecurityError` | SSRF / allowlist / scheme / userinfo violations. |
| `McpAuthError`        | 401 / 403 from the remote server.                |
| `McpTimeoutError`     | Call exceeded `timeoutMs`.                       |
| `McpProtocolError`    | Malformed MCP response (JSON-RPC parse/invalid). |
| `McpTransportError`   | DNS, TCP, TLS, abort, or fallback failures.      |

Catch `McpError` for any failure, or a specific subclass to react to a category.

## Observability

The service logs structured events with header names only, never values:

```
mcp.connect host=mcp.linear.app transport=sse headers=[Authorization]
mcp.connect.done host=mcp.linear.app transport=sse outcome=success latencyMs=412
mcp.callTool host=mcp.linear.app transport=sse toolName=createIssue outcome=success latencyMs=623
```

Override `MCP_METRICS` for custom metric collection:

```ts
@Module({
  providers: [{ provide: MCP_METRICS, useClass: MyOtelMetrics }],
})
```

## Public API

- **Module:** `McpModule`
- **Tools:** `McpCallTool`, `McpListToolsTool`, `McpToolBase`
- **Services:** `McpClientService`
- **Schemas:** `McpToolConfigSchema`, `McpCallToolArgsSchema`, `McpListToolsArgsSchema`, `McpConnectionArgsSchema`
- **Types:** `McpToolConfig`, `McpToolConfigInput`, `McpTransportKind`, `McpCallToolResult`, `McpClientCallOptions`
- **Errors:** `McpError`, `McpUrlSecurityError`, `McpAuthError`, `McpTimeoutError`, `McpProtocolError`, `McpTransportError`
- **Tokens:** `MCP_DEFAULT_CONFIG`, `MCP_METRICS`, `MCP_ENV_READER`
- **Interfaces:** `McpMetricsPort`, `McpConnectSample`, `McpCallSample`, `McpCallOutcome`, `EnvReader`
- **Utilities:** `hostMatchesAllowlist`, `assertIpIsPublic`, `assertResolvableHostIsPublic`, `assertMcpUrlSafe`
- **Implementations:** `ProcessEnvReader`, `NoopMcpMetrics`

## Dependencies

| Package                          | Role                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `@modelcontextprotocol/sdk`      | MCP client, Streamable HTTP and SSE transports       |
| `@loopstack/common`              | `BaseTool`, `@Tool`, `ToolCallOptions`, `RunContext` |
| `@loopstack/core`                | `LoopCoreModule` (NestJS integration)                |
| `@nestjs/common`, `@nestjs/core` | Dependency injection, module system                  |
| `zod`                            | Schema validation                                    |

## Related

- [`@loopstack/mcp-linear-example-workflow`](https://loopstack.ai/docs/registry/examples/mcp-linear-example-workflow) — Full working example connecting a ChatAgentWorkflow to Linear via MCP.
- [Agent Workflows](https://loopstack.ai/docs/build/ai/agent-workflows) — How `ChatAgentWorkflow` and tool resolution work.
- [Tool Configuration](https://loopstack.ai/docs/build/fundamentals/tools) — How `configSchema` and `options.config` are merged at call time.
- [`@loopstack/claude-module`](https://loopstack.ai/docs/registry/features/claude-module) — LLM provider that powers the agent loop calling MCP tools.

## About

**Author:** Jakob Klippel
**License:** MIT
