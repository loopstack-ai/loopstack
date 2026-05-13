# @loopstack/mcp-linear-example-workflow

Demonstrates how to connect a Loopstack chat agent to [Linear's hosted MCP server](https://linear.app/changelog/2025-04-18-mcp) using [`@loopstack/mcp-module`](../../features/mcp-module).

## By using this example you'll get...

- A `ChatAgentWorkflow` sub-workflow with `McpListToolsTool` and `McpCallTool` injected
- A working `@InjectTool` config with `allowedHosts` and `hostHeaderEnv`
- A safe, minimal pattern for talking to a hosted MCP server with OAuth-style auth

## Installation

```sh
loopstack add @loopstack/mcp-linear-example-workflow
```

This installs `@loopstack/mcp-module` and `@loopstack/agent` automatically.

## Environment

Set the Linear OAuth token (the header value is sent **raw**, so include the `Bearer ` prefix):

```env
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

> Linear's MCP endpoint requires an OAuth access token. Personal API keys (`lin_api_*`) will not authenticate.

## How It Works

1. The workflow injects `McpListToolsTool` and `McpCallTool` with `mcp.linear.app` in `allowedHosts`.
2. `hostHeaderEnv` maps `Authorization` → `LINEAR_MCP_TOKEN` for the Linear host. The value is read at call time, never logged.
3. The agent calls Linear's MCP at `https://mcp.linear.app/mcp` over Streamable HTTP — the default transport for modern MCP servers.

## Public API

- `McpLinearExampleModule`
- `McpLinearExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/agent`
- `@loopstack/mcp-module`
