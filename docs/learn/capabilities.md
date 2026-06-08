---
title: Capabilities Overview
description: Quick-reference table of all Loopstack capabilities — AI/LLM features, workflow patterns, integrations, and UI — with links to the corresponding build guides.
---

# Capabilities

Quick reference for what Loopstack can do. Each entry links to the relevant build guide.

## AI & LLM

| Capability        | Description                                                        | Guide                                                 |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Text generation   | Call Claude, OpenAI, or other LLMs with prompts or message history | [Text Generation](/docs/build/ai/text-generation)     |
| Structured output | Force LLM to return data matching a JSON Schema                    | [Structured Output](/docs/build/ai/structured-output) |
| Tool calling      | LLM decides which tools to invoke (function calling)               | [Tool Calling](/docs/build/ai/tool-calling)           |
| Multi-turn chat   | Conversation loops with message accumulation                       | [Chat Flows](/docs/build/ai/chat-flows)               |
| AI agents         | Autonomous tool-calling loops with error recovery                  | [Agent Workflows](/docs/build/ai/agent-workflows)     |
| Multi-provider    | Use Claude and OpenAI in the same app, switch per-call             | [LLM Providers](/docs/build/ai/llm-providers)         |
| Streaming         | Real-time token streaming to the UI                                | [LLM Providers](/docs/build/ai/llm-providers)         |
| Prompt templates  | Handlebars templates for dynamic prompts                           | [Templates](/docs/build/patterns/templates)           |

## Workflow Patterns

| Capability        | Description                                                    | Guide                                                       |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| State machines    | Typed state, automatic persistence, transitions between places | [Workflows](/docs/build/fundamentals/workflows)             |
| Human-in-the-loop | Pause for user input, forms, confirmations                     | [Human-in-the-Loop](/docs/build/patterns/human-in-the-loop) |
| Sub-workflows     | Launch child workflows, receive results via callbacks          | [Sub-Workflows](/docs/build/patterns/sub-workflows)         |
| Dynamic routing   | Guard-based conditional branching with priorities              | [Dynamic Routing](/docs/build/patterns/dynamic-routing)     |
| Error handling    | Auto-retry with backoff, custom error places, manual retry     | [Error Handling](/docs/build/patterns/error-handling)       |
| State management  | Typed state interface, persistence across pauses               | [State Management](/docs/build/patterns/state-management)   |

## Tools & Documents

| Capability       | Description                                                | Guide                                               |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Custom tools     | Reusable logic with Zod schemas, injectable into workflows | [Tools](/docs/build/fundamentals/tools)             |
| Custom documents | Typed UI components with forms, code editors, buttons      | [Documents](/docs/build/fundamentals/documents)     |
| Task tools       | Tools that launch sub-workflows (for agent delegation)     | [Sub-Workflows](/docs/build/patterns/sub-workflows) |

## Integrations

| Capability             | Description                                             | Guide                                                                     |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| OAuth 2.0              | Provider-agnostic OAuth with Google and GitHub built-in | [OAuth](/docs/build/integrations/oauth)                                   |
| Docker sandboxes       | Run untrusted code in isolated containers               | [Sandbox](/docs/build/integrations/sandbox)                               |
| Secrets management     | Request and store API keys/tokens from users at runtime | [Secrets](/docs/build/integrations/secrets)                               |
| Programmatic execution | Trigger workflows from APIs, webhooks, cron jobs        | [Programmatic Execution](/docs/build/integrations/programmatic-execution) |

## UI & Studio

| Capability                 | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| Visual workflow monitoring | Watch workflow execution in real-time                      |
| Chat interface             | `prompt-input` widget for conversational UIs               |
| Form widgets               | Text, textarea, select, slider, code-view, radio, checkbox |
| Document actions           | Buttons that trigger workflow transitions                  |
| Conditional widgets        | `enabledWhen` shows/hides UI based on workflow state       |
| Sub-workflow embedding     | LinkDocument displays sub-workflow progress inline         |

## Extensibility

| Capability             | Description                                              | Guide                                                    |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Custom LLM providers   | Implement `LlmProviderInterface` for any LLM API         | [Creating LLM Providers](/docs/extend/llm-providers)     |
| Custom OAuth providers | Implement `OAuthProviderInterface` for any OAuth service | [Creating OAuth Providers](/docs/extend/oauth-providers) |
| Registry packages      | Browse and install pre-built tools and workflows         | [Registry](/docs/reference/registry)                     |

## Tech Stack

- **Runtime:** Node.js, TypeScript, NestJS 11
- **Database:** PostgreSQL (TypeORM), Redis (ioredis, BullMQ)
- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
- **Package manager:** npm with workspaces
