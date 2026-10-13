---
title: MCP Examples
description: Workflow example for remote MCP servers in Loopstack — McpModule.forRoot with an allowedHosts allowlist and a hostHeaderEnv auth header mapping, and a chat agent that uses the mcp_list_tools and mcp_call tools against Linear's hosted MCP server.
---

# MCP Examples

> Remote MCP client examples for the [Loopstack](https://loopstack.ai) automation framework.

Connects a chat agent to a remote Model Context Protocol server with `@loopstack/mcp`. The configuration you need to copy is in the module: which hosts the MCP tools may reach, and which env var holds each host's auth header.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/agent @loopstack/claude @loopstack/common @loopstack/mcp
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { McpExamplesModule } from './mcp/mcp-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), McpExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The example launches `ChatAgentWorkflow` from `@loopstack/agent`, which calls the LLM through `@loopstack/llm-provider`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { McpExamplesModule } from './mcp/mcp-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }), McpExamplesModule],
})
export class AppModule {}
```

`McpExamplesModule` imports `AgentModule` (the `ChatAgentWorkflow` class), `ClaudeModule` (provider) and `McpModule.forRoot(...)`. `McpModule.forRoot` registers a global module with one default config for the whole app, so call it once. If your app already calls it, add the Linear host and header mapping there and remove the call from this module.

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
LINEAR_MCP_TOKEN="Bearer lin_oauth_..."
```

`LINEAR_MCP_TOKEN` holds the full `Authorization` header value, including `Bearer`.

## Examples

| Example           | Studio title           | Description                                                                          |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| [Linear](#linear) | `MCP - Linear Example` | Chat agent connected to Linear's hosted MCP server via `mcp_list_tools` + `mcp_call` |

---

## Linear

Launches `ChatAgentWorkflow` with the `mcp_list_tools` and `mcp_call` tools and a system prompt that points at Linear's hosted MCP server. The agent discovers Linear's tools at runtime, then calls the one that answers the user's question. You can keep chatting with it after the first answer.

### What it demonstrates

- `McpModule.forRoot({ allowedHosts })`: the MCP tools refuse every `serverUrl` whose host is not in the list, so a URL chosen by the model cannot reach other hosts
- `hostHeaderEnv`: the `Authorization` header for `mcp.linear.app` is read from `LINEAR_MCP_TOKEN` at call time; the token is never in the config, the prompt or the logs
- Giving an agent the MCP tools by name: `tools: ['mcp_list_tools', 'mcp_call']`. The agent passes `serverUrl` and `transport` on each call, as the system prompt tells it to

### Key code

```ts
McpModule.forRoot({
  allowedHosts: ['mcp.linear.app'],
  hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
}),
```

```ts
@Transition({ to: 'chatting' })
async startChat(_state: Record<string, unknown>, ctx: RunContext<LinearExampleArgs>) {
  await this.chatAgentWorkflow.run(
    {
      system: this.render(join(__dirname, 'templates', 'system.md')),
      tools: ['mcp_list_tools', 'mcp_call'],
      userMessage: ctx.args.initialMessage,
    },
    { show: 'inline', label: 'Linear Agent Chat' },
  );
}
```

To reach another MCP server, add its host to `allowedHosts`, map its auth header in `hostHeaderEnv`, and name its URL in the system prompt.

### Files

- `mcp-examples.module.ts` — the `McpModule.forRoot` configuration
- `workflows/linear/linear-example.workflow.ts` — workflow class
- `workflows/linear/templates/system.md` — system prompt with the server URL and transport

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
