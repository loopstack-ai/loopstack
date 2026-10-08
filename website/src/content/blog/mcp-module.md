---
title: 'Plug Your Agents Into Any MCP Server'
description: 'Introducing @loopstack/mcp-module, a module that allows you to list and call tools on remote MCP servers from any Loopstack workflow.'
date: '2026-05-18'
author: 'Loopstack Team'
tags: ['Release', 'MCP', 'Integrations']
img: '/images/blog/mcp-module.png'
imgSize: sm
imgThemeAdapt: true
---

Your agent is only as useful as the tools it can reach. If those tools live behind a remote MCP server like Linear, GitHub or an internal service, getting there has historically meant writing your own client and your own auth plumbing.

`@loopstack/mcp-module` ships two workflow tools that connect any Loopstack agent to a remote [Model Context Protocol](https://modelcontextprotocol.io) server over Streamable HTTP or legacy SSE. No transport code, no header juggling.

## Two Tools, One Job

- **`McpListToolsTool`** — discover what a remote MCP server exposes.
- **`McpCallTool`** — invoke one of those tools.

Both take a `serverUrl` per call, so a single agent can hop between every host on its allowlist within the same conversation. Switch hosts mid-conversation without re-registering anything.

## Inject It Like Any Other Tool

The whole module follows the same `@InjectTool` pattern you already use everywhere else:

```ts
@InjectTool({
  allowedHosts: ['mcp.linear.app'],
  hostHeaderEnv: {
    'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
  },
})
private mcpCallTool: McpCallTool;
```

Two lines of config and your agent is talking to Linear. Add another entry to `allowedHosts` and another `hostHeaderEnv` mapping and it's talking to GitHub too. Auth tokens are sourced from `process.env` at call time and never written into static config or logged.
Also an allowlist plus DNS resolution check keeps a model-controlled URL from wandering into your internal network.

## Try It

```bash
npm install @loopstack/agent-examples
```

Or to copy the source into your project so you can modify it:

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/agent-examples#main
```

(The MCP Linear example lives at `src/workflows/mcp-linear/` inside that package.)

Follow the README and you'll get a working chat agent wired to Linear's hosted MCP server. Set `LINEAR_MCP_TOKEN="Bearer lin_oauth_..."` in your env and you're done. Point a workflow at it and your agent can list and create issues from chat.

For the full security model, transport selection, and the env-reader / metrics extension points, the [`@loopstack/mcp-module` README](https://github.com/loopstack-ai/loopstack/tree/main/registry/features/mcp-module) walks through every knob.

## Wrapping Up

MCP is becoming the integration layer for AI tools, and the most valuable agents are the ones that can reach beyond a single vendor. This module makes that reach trivial to configure. We're excited to see what you connect to it.

_— Your Loopstack Team_

---

Ready to join the conversation? Check out our [GitHub](https://github.com/loopstack-ai/loopstack), connect with us on [Discord](https://discord.gg/svAHrkxKZg), and follow our journey on [LinkedIn](https://www.linkedin.com/company/loopstack-ai/).
