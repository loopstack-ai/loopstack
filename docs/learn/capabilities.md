---
title: Capabilities Overview
description: Quick-reference table of all Loopstack capabilities — AI/LLM features, workflow patterns, integrations, and UI — with links to the corresponding build guides.
---

# Capabilities

Quick reference for what Loopstack can do. Each entry links to the relevant build guide.

## AI & LLM

| Capability        | Description                                                        | Guide                                                 |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Text generation   | Call Claude, OpenAI, or other LLMs with prompts or message history | [Text Generation](../build/ai/text-generation.md)     |
| Structured output | Force LLM to return data matching a JSON Schema                    | [Structured Output](../build/ai/structured-output.md) |
| Tool calling      | LLM decides which tools to invoke (function calling)               | [Tool Calling](../build/ai/tool-calling.md)           |
| Multi-turn chat   | Conversation loops with message accumulation                       | [Chat Flows](../build/ai/chat-flows.md)               |
| AI agents         | Autonomous tool-calling loops with error recovery                  | [Agent Workflows](../build/ai/agent-workflows.md)     |
| Multi-provider    | Use Claude and OpenAI in the same app, switch per-call             | [LLM Providers](../build/ai/llm-providers.md)         |
| Streaming         | Real-time token streaming to the UI                                | [LLM Providers](../build/ai/llm-providers.md)         |
| Prompt templates  | Handlebars templates for dynamic prompts                           | [Templates](../build/patterns/templates.md)           |

## Workflow Patterns

| Capability        | Description                                                    | Guide                                                       |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| State machines    | Typed state, automatic persistence, transitions between places | [Workflows](../build/fundamentals/workflows.md)             |
| Human-in-the-loop | Pause for user input, forms, confirmations                     | [Human-in-the-Loop](../build/patterns/human-in-the-loop.md) |
| Sub-workflows     | Launch child workflows, receive results via callbacks          | [Sub-Workflows](../build/patterns/sub-workflows.md)         |
| Dynamic routing   | Guard-based conditional branching with priorities              | [Dynamic Routing](../build/patterns/dynamic-routing.md)     |
| Error handling    | Auto-retry with backoff, custom error places, manual retry     | [Error Handling](../build/patterns/error-handling.md)       |
| State management  | Typed state interface, persistence across pauses               | [State Management](../build/patterns/state-management.md)   |

## Tools & Documents

| Capability       | Description                                                | Guide                                               |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Custom tools     | Reusable logic with Zod schemas, injectable into workflows | [Tools](../build/fundamentals/tools.md)             |
| Custom documents | Typed UI components with forms, code editors, buttons      | [Documents](../build/fundamentals/documents.md)     |
| Task tools       | Tools that launch sub-workflows (for agent delegation)     | [Sub-Workflows](../build/patterns/sub-workflows.md) |

## Integrations

| Capability             | Description                                                          | Guide                                                                                  |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| OAuth 2.0              | Provider-agnostic OAuth with Google and GitHub built-in              | [OAuth](../build/integrations/oauth.md)                                                |
| Docker sandboxes       | Run untrusted code in isolated containers                            | [Sandbox](../build/integrations/sandbox.md)                                            |
| Secrets management     | Request and store API keys/tokens from users at runtime              | [Secrets](../build/integrations/secrets.md)                                            |
| Programmatic execution | Trigger workflows from APIs, webhooks, cron jobs                     | [Scheduling & Programmatic Execution](../build/integrations/programmatic-execution.md) |
| Scheduling             | Cron, webhooks, delayed runs, and batch fan-out via `WorkflowRunner` | [Scheduling & Programmatic Execution](../build/integrations/programmatic-execution.md) |

## UI & Studio

| Capability                 | Description                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Visual workflow monitoring | Watch workflow execution in real-time                                                                        |
| Chat interface             | `prompt-input` widget for conversational UIs                                                                 |
| Form widgets               | Text, textarea, select, slider, code-view, radio, checkbox                                                   |
| Document actions           | Buttons that trigger workflow transitions                                                                    |
| Conditional widgets        | `enabledWhen` shows/hides UI based on workflow state                                                         |
| Sub-workflow embedding     | `.run()` auto-renders child workflows inline in the parent's view via `show: 'inline' \| 'link' \| 'hidden'` |

## Extensibility

| Capability             | Description                                              | Guide                                                    |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Custom LLM providers   | Implement `LlmProviderInterface` for any LLM API         | [Creating LLM Providers](../extend/llm-providers.md)     |
| Custom OAuth providers | Implement `OAuthProviderInterface` for any OAuth service | [Creating OAuth Providers](../extend/oauth-providers.md) |
| Registry packages      | Browse and install pre-built tools and workflows         | [Registry](../registry/index.md)                         |

## Tech Stack

- **Runtime:** Node.js, TypeScript, NestJS 11
- **Database:** PostgreSQL (TypeORM), Redis (ioredis, BullMQ)
- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
- **Package manager:** npm with workspaces
