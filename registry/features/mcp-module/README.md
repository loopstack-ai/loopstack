# @loopstack/mcp-module

> Remote-MCP client tools for the [Loopstack AI](https://loopstack.ai) automation framework.

Lets a Loopstack agent list and call tools on remote Model Context Protocol (MCP)
servers over HTTPS — Streamable HTTP or legacy SSE — with a strict SSRF allowlist
and zero-trust handling of authentication secrets.

## What this is (and isn't)

- **Is:** a _client_ module — your Loopstack app reaches _out_ to a remote MCP
  server (Linear, GitHub, internal tools, etc.).
- **Isn't:** an MCP _server_ — it does not expose your workflows over MCP.

## Tools

| Tool               | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `McpListToolsTool` | Discover the tools a remote MCP server exposes. |
| `McpCallTool`      | Invoke a tool on a remote MCP server.           |

Both take `serverUrl`, `transport` (`streamableHttp` or `sse`), and `timeoutMs`
at call time. `McpCallTool` additionally takes `toolName` and `arguments`.

## Security model

Every connection passes three checks before any bytes go out:

1. **Allowlist** — `serverUrl`'s hostname must match `allowedHosts`. Exact match
   or `*.example.com` (which also matches `example.com`).
2. **Scheme** — `https://` by default; `http://` only if `allowInsecureHttp: true`.
3. **Public-IP resolution** — DNS (or a literal IP) must resolve to a routable
   public address. Loopback, RFC1918, link-local, ULA, and IPv4-mapped
   equivalents are rejected. Override with `allowPrivateHosts: true` for trusted
   local MCP proxies.

Userinfo in the URL (`https://user:pw@host/...`) is rejected — credentials must
flow through headers.

## Authentication

Configure auth headers via constructor injection config:

```ts
constructor(private readonly mcpCallTool: McpCallTool) {}

// Configure allowedHosts and hostHeaderEnv via call config:
await this.mcpCallTool.call(args, {
  config: {
    allowedHosts: ['mcp.linear.app'],
    hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
  },
});
```

Three knobs, in increasing specificity:

| Knob             | Use for                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `defaultHeaders` | Static, **non-secret** values (e.g. `X-Trace: on`). Sensitive header names like `Authorization` are rejected here.      |
| `headerEnv`      | `header → env-var` mapping applied to _every_ host. Value is read from `process.env` at call time.                      |
| `hostHeaderEnv`  | `host → { header → env-var }`. Use the hostname or `'*'` (applied to all). Host-specific entries override the wildcard. |

Precedence (later wins): `defaultHeaders` → `headerEnv` → `hostHeaderEnv['*']` → `hostHeaderEnv[hostname]`. `hostHeaderEnv['*']` outranks `headerEnv` because it lives in the same map as the host-specific entries — keeping all host-scoped knobs together in `hostHeaderEnv` is the intended override layer. Keys are matched case-insensitively (HTTP semantics).

Header _names_ are logged on connect (e.g. `headers=[Authorization]`); values
never are. If a referenced env var is unset or empty, the header is silently
omitted — so missing `LINEAR_MCP_TOKEN` means no `Authorization` header, not a
crash.

The header value is sent **raw**. If the remote server expects `Bearer <token>`,
your env var must contain the `Bearer ` prefix:

```env
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

## Registering the tools (workspace vs workflow)

Import `McpModule` in your Nest module so the tool classes are available. Then
register **instances** via the constructor — where you inject them
depends on how you run the LLM loop.

| How you run the agent                                                                                                                              | Where to injection MCP tools                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`ChatAgentWorkflow` / `AgentWorkflow` as a sub-workflow** (`this.agent.run({ tools: [...] })`)                                                   | **Workspace** — the child agent resolves tools from the executing workflow first, then the workspace. Tools on the parent workflow are not visible while the sub-agent runs. |
| **Inline agent loop in one workflow** (your transitions call `this.llmGenerateText.call()` / `this.llmDelegateToolCalls.call()` on the same class) | **That workflow** — same pattern as other registry agents (e.g. Google Workspace).                                                                                           |

See [@loopstack/agent — Tool Resolution]() for the full resolution order.

### With `ChatAgentWorkflow` (register on the workspace)

This is the pattern used by `@loopstack/mcp-linear-example-workflow` and the app
template: declare MCP tools once on the workspace, then pass their property names
to `agent.run()`.

```ts
import { Injectable } from '@nestjs/common';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { InjectTool, InjectWorkflow, Workspace } from '@loopstack/common';
import { McpCallTool, McpListToolsTool } from '@loopstack/mcp-module';
import { MyMcpWorkflow } from './my-mcp.workflow';

const mcpToolConfig = {
  allowedHosts: ['mcp.linear.app', 'mcp.github.com'],
  hostHeaderEnv: {
    'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
    'mcp.github.com': { Authorization: 'GITHUB_MCP_TOKEN' },
  },
} as const;

@Injectable()
@Workspace({ uiConfig: { title: 'My Workspace' } })
export class MyWorkspace {
  constructor(
    public readonly mcpAgent: MyMcpWorkflow,
    public readonly mcpListTools: McpListToolsTool,
    public readonly mcpCallTool: McpCallTool,
  ) {}
}
```

```ts
// my-mcp.workflow.ts — parent only starts the sub-agent
constructor(private readonly agent: ChatAgentWorkflow) { super(); }

await this.agent.run({
  system: '...',
  tools: ['mcpListTools', 'mcpCallTool'],
  userMessage: '...',
});
```

### Inline agent loop (register on the workflow)

If your workflow owns the LLM turns and tool delegation (no `ChatAgentWorkflow`
sub-workflow), inject MCP tools on that same workflow class alongside
`LlmGenerateTextTool` and `LlmDelegateToolCallsTool`.

The agent picks `serverUrl` per call, so it can hop between any of the
allowlisted hosts within the same chat.

## Multiple MCP servers

`serverUrl` is a per-call argument. **An agent can reach any host listed in
`allowedHosts`** — there is no "primary" server. To add a new server:

1. Add its hostname to `allowedHosts` on both injection configs.
2. Add its auth mapping to `hostHeaderEnv`.
3. Set the corresponding env var.

Dynamic, end-user-driven server registration (paste any URL mid-chat) is
deliberately _not_ supported — the allowlist exists to prevent agents from
being tricked into hitting internal hosts. Adding that flow safely requires
a per-user registry plus an auth onboarding step (out of scope here).

## Transport guidance

| Server                    | Transport                  |
| ------------------------- | -------------------------- |
| Linear (`mcp.linear.app`) | `sse`                      |
| Most modern hosted MCP    | `streamableHttp` (default) |

Pass `transport: 'sse'` per call when needed.

## Errors

All failures throw subclasses of `McpError`:

- `McpUrlSecurityError` — SSRF / allowlist / scheme / userinfo violations.
- `McpAuthError` — 401 / 403 from the remote (or transport-equivalent).
- `McpTimeoutError` — call exceeded `timeoutMs`.
- `McpProtocolError` — malformed MCP response.
- `McpTransportError` — DNS, TCP, TLS, abort, fallback.

Catch `McpError` for any failure, or a specific subclass to react to a category.

## Observability

The service logs structured events with header _names_ only, never values:

```
mcp.connect host=mcp.linear.app transport=sse headers=[Authorization]
mcp.connect.done host=mcp.linear.app transport=sse outcome=success latencyMs=412
mcp.callTool host=mcp.linear.app transport=sse toolName=createIssue outcome=success latencyMs=623
```

For metrics, implement `McpMetricsPort` and bind it via the `MCP_METRICS`
provider token — the default is a no-op:

```ts
@Module({
  providers: [{ provide: MCP_METRICS, useClass: MyOtelMetrics }],
})
```

Same pattern for `MCP_ENV_READER` if you need to source secrets from somewhere
other than `process.env` (e.g. a secrets manager).

## Testing

The module ships unit tests for:

- `hostMatchesAllowlist`, `assertIpIsPublic`, `assertMcpUrlSafe` (with mocked DNS)
- `McpClientService.mergeHeaders` (precedence, host scoping, env-var skipping)
- Both tools (config guard + arg forwarding)
- Config-schema validation (secret-header rejection, strict mode, required keys)

Run with:

```sh
npm test
```
