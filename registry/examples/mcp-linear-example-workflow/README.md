# @loopstack/mcp-linear-example-workflow

Demonstrates how to connect a Loopstack chat agent to [Linear's hosted MCP server](https://linear.app/changelog/2025-04-18-mcp) using [`@loopstack/mcp-module`](../../features/mcp-module).

## By using this example you'll get...

- A parent workflow that launches `ChatAgentWorkflow` with `mcpListTools` and `mcpCallTool`
- A reference `@InjectTool` config with `allowedHosts` and `hostHeaderEnv` (on the workflow class for documentation)
- A safe, minimal pattern for talking to a hosted MCP server with OAuth-style auth

> **Workspace registration required.** Because this example uses `ChatAgentWorkflow` as a sub-workflow, MCP tools must also be registered on your **workspace** with the same `@InjectTool` config — not only on `McpLinearExampleWorkflow`. While the chat agent runs, tool resolution uses the executing workflow (`ChatAgentWorkflow`) and then the workspace. See [@loopstack/mcp-module — Registering the tools](https://github.com/loopstack-ai/loopstack/blob/main/registry/features/mcp-module/README.md#registering-the-tools-workspace-vs-workflow). The app template shows this in `default.workspace.ts`.

## Installation

```sh
npm install @loopstack/mcp-linear-example-workflow
```

The package depends on `@loopstack/mcp-module` and `@loopstack/agent`.

## Environment

Set the Linear OAuth token (the header value is sent **raw**, so include the `Bearer ` prefix):

```env
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

> Linear's MCP endpoint requires an OAuth access token. Personal API keys (`lin_api_*`) will not authenticate.

## How It Works

1. Import `McpModule` and register `McpListToolsTool` / `McpCallTool` on your workspace with `mcp.linear.app` in `allowedHosts` (copy the config from `mcp-linear-example.workflow.ts`).
2. `hostHeaderEnv` maps `Authorization` → `LINEAR_MCP_TOKEN` for the Linear host. The value is read at call time, never logged.
3. `McpLinearExampleWorkflow` starts `ChatAgentWorkflow` with `tools: ['mcpListTools', 'mcpCallTool']`.
4. The chat agent calls Linear's MCP at `https://mcp.linear.app/mcp` over Streamable HTTP.

## Public API

- `McpLinearExampleModule`
- `McpLinearExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/agent`
- `@loopstack/mcp-module`
