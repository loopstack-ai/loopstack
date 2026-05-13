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

Configure auth headers via `@InjectTool(...)`:

```ts
@InjectTool({
  allowedHosts: ['mcp.linear.app'],
  hostHeaderEnv: {
    'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
  },
})
private readonly mcpCallTool: McpCallTool;
```

Three knobs, in increasing specificity:

| Knob             | Use for                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `defaultHeaders` | Static, **non-secret** values (e.g. `X-Trace: on`). Sensitive header names like `Authorization` are rejected here.      |
| `headerEnv`      | `header → env-var` mapping applied to _every_ host. Value is read from `process.env` at call time.                      |
| `hostHeaderEnv`  | `host → { header → env-var }`. Use the hostname or `'*'` (applied to all). Host-specific entries override the wildcard. |

Header _names_ are logged on connect (e.g. `headers=[Authorization]`); values
never are. If a referenced env var is unset or empty, the header is silently
omitted — so missing `LINEAR_MCP_TOKEN` means no `Authorization` header, not a
crash.

The header value is sent **raw**. If the remote server expects `Bearer <token>`,
your env var must contain the `Bearer ` prefix:

```env
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

## Using the tools in a workflow

```ts
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, InjectTool, InjectWorkflow, Workflow } from '@loopstack/common';
import { McpCallTool, McpListToolsTool } from '@loopstack/mcp-module';

@Workflow({
  /* ... */
})
export class MyMcpAgent extends BaseWorkflow<Args> {
  @InjectWorkflow({ model: 'claude-sonnet-4-6' }) private agent: ChatAgentWorkflow;

  @InjectTool({
    allowedHosts: ['mcp.linear.app', 'mcp.github.com'],
    hostHeaderEnv: {
      'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
      'mcp.github.com': { Authorization: 'GITHUB_MCP_TOKEN' },
    },
  })
  private mcpListTools: McpListToolsTool;

  @InjectTool({
    allowedHosts: ['mcp.linear.app', 'mcp.github.com'],
    hostHeaderEnv: {
      'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
      'mcp.github.com': { Authorization: 'GITHUB_MCP_TOKEN' },
    },
  })
  private mcpCallTool: McpCallTool;
}
```

The agent picks `serverUrl` per call, so it can hop between any of the
allowlisted hosts within the same chat.

## Multiple MCP servers

`serverUrl` is a per-call argument. **An agent can reach any host listed in
`allowedHosts`** — there is no "primary" server. To add a new server:

1. Add its hostname to `allowedHosts` on both `@InjectTool` configs.
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
