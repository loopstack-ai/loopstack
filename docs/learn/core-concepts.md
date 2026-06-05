# Core Concepts

Loopstack has three core building blocks — workflows, tools, and documents — plus a modular system of extensions for LLM providers, OAuth, sandboxes, and more.

## Workflows

A workflow is a **state machine**. It defines a sequence of steps (transitions) that move through named states (places). Each transition runs TypeScript code — calling tools, saving documents, making decisions.

```
start → fetch_data → process → waiting_for_approval → approved → end
```

Key properties:

- **Transitions** move between places and run your logic
- **Guards** route conditionally (if X, go left; otherwise go right)
- **Wait transitions** pause until a user clicks a button, a sub-workflow completes, or an API calls back
- **State** is typed and persisted — survives pauses and restarts
- Workflows can **launch sub-workflows** and receive their results via callbacks

## Tools

A tool is a **reusable unit of logic**. It has a typed input schema (Zod), a description (used by LLMs), and an implementation. Tools are injected into workflows and called with `await this.tool.call(args)`.

Tools serve two purposes:

1. **Direct use** — workflows call tools explicitly in transitions
2. **LLM function calling** — the LLM reads the tool's description and schema, then decides when to call it

Built-in tools include LLM text generation, structured output, tool delegation, sandbox execution, and more. You create custom tools for your domain logic.

## Documents

A document is a **typed data object** displayed in the Loopstack Studio UI. It has a Zod schema for validation and a YAML config for rendering.

Documents are how workflows communicate with users:

- **LlmMessageDocument** — chat messages, from `@loopstack/llm-provider-module`
- **MarkdownDocument** — rendered markdown
- **LinkDocument** — clickable links to sub-workflows
- **ErrorDocument** — error messages
- **Custom documents** — forms, code editors, structured data displays

Documents are saved via `this.documentStore.save()` and automatically appear in the Studio UI.

## Modules & Extensions

Loopstack is modular. The core framework provides the workflow engine, tools, and documents. Everything else is added through NestJS modules that you import as needed:

- **LLM Providers** — Claude, OpenAI, or custom providers. Multi-provider support with runtime switching.
- **OAuth** — Provider-agnostic OAuth 2.0 with Google and GitHub built-in.
- **Sandboxes** — Run untrusted code in isolated Docker containers.
- **Secrets** — Request and store API keys from users at runtime.
- **Agents** — Built-in agent workflows with automatic tool-calling loops.

You only import what you use. Adding a capability is one line in your module imports.

## How They Fit Together

**Workflows** call **tools** and save **documents**. That's the core loop. Extension modules add capabilities like LLM access or OAuth that your tools and workflows can use.

## NestJS Integration

Loopstack is built on NestJS. Workflows, tools, and services are standard NestJS providers:

- **Modules** group related workflows, tools, and services
- **Constructor injection** wires everything together
- **Decorators** (`@Workflow`, `@Tool`, `@Document`, `@Transition`, `@Guard`) configure behavior

If you know NestJS, you already know how to structure a Loopstack project.

## Next steps

- [Capabilities](/docs/learn/capabilities) — feature matrix for quick validation
- [Getting Started](/docs/build/getting-started) — build your first workflow
- [Creating Workflows](/docs/build/fundamentals/workflows) — deep dive into workflow patterns
