---
title: 'Loopstack v0.31: Multi-Provider AI, Agent Workflows, and a Platform That Scales'
description: 'Announcing Loopstack v0.31 with LLM provider registry, AgentWorkflow, 12 new registry modules, workflow resilience, a redesigned Studio, and production-ready infrastructure.'
date: '2026-05-23'
author: 'Loopstack Team'
tags: ['Release', 'v0.31']
draft: true
img: '/images/blog/release-0-31.png'
---

This is the biggest release we've shipped. Since v0.20, we've added multi-provider LLM support, a generic agent loop, a dozen new registry modules, workflow resilience primitives, a completely redesigned Studio, and the infrastructure you need to run Loopstack in production. Here's everything that changed.

## One Import to Rule Them All

Setting up a Loopstack project used to mean importing and configuring multiple modules — `LoopCoreModule`, `CommonModule`, `PersistenceModule`, and more. That's gone.

`LoopstackModule.forRoot()` is now the single entry point. One import, one config object, and your app is wired up with database, auth, API, and the workflow engine. It's globally available, so registry modules don't need to import it again.

```typescript
@Module({
  imports: [
    LoopstackModule.forRoot({
      database: {/* ... */},
      auth: { enabled: true },
    }),
  ],
})
export class AppModule {}
```

## Workspace is Now App

We renamed `@Workspace()` to `@App()` and `BaseWorkspace` to `BaseApp`. This clears up a longstanding source of confusion: an app is your code-level blueprint (workflows, tools, documents), while a workspace is the runtime entity (a database row, per-user, with environments).

The execution context got a cleanup too. `this.ctx.context` became `this.ctx.run`, `this.ctx.parent` became `this.ctx.workflow`, and `this.ctx.workspace` became `this.ctx.app`. Every property name now tells you exactly what it refers to.

## WorkflowRunner: Programmatic Execution

Up until now, workflows could only be started through the API or from inside other workflows. `WorkflowRunner` changes that. It's a NestJS service you inject anywhere — startup hooks, event handlers, scheduled jobs — and it gives you full control: `run()`, `runSync()`, `runById()`, `resume()`, and `cancel()`.

This is the foundation for building systems where workflows are triggered by external events, not just user clicks.

## LLM Provider Registry

Loopstack is no longer tied to a single LLM. The new `@loopstack/llm-provider` introduces a provider-agnostic registry with a clean `LlmProviderInterface`. Claude and OpenAI ship as first-party providers, and you can add your own.

Adapter tools like `LlmGenerateText`, `LlmGenerateObject`, and `LlmDelegateToolCalls` abstract away the differences between providers. Your workflows don't change when you switch models — you just change the provider config.

We also introduced `ServerTool`, a base class for provider-managed tools like web search or code execution, and a tool configuration system with `configSchema` on `@Tool()` and `@InjectTool` defaults with deep merging. Tools are now configurable without changing their code.

## AgentWorkflow

Building an LLM agent loop used to mean writing a custom workflow with manual tool resolution, message handling, and loop control. `AgentWorkflow` handles all of that.

It's a generic, non-subclassable workflow that runs the classic agent loop: LLM generates a response, tools get called, results feed back to the LLM, repeat until done. You configure it entirely through `run()` arguments — system prompt, tools, provider, model. No subclassing needed.

`ChatAgentWorkflow` extends this with interactive multi-turn chat, and the code-agent module now uses `AgentWorkflow` under the hood instead of its own custom implementation.

## A Growing Registry

This release adds 12 new registry modules. Here's what's available:

**Git & GitHub** — `@loopstack/git` ships 12 tools for status, commit, push, pull, diff, branch, and worktree operations. `@loopstack/github` adds 25 tools covering repos, issues, PRs, content, actions, search, and user management. Both include OAuth providers and Studio UI integration.

**Google Workspace** — `@loopstack/google-workspace` brings 11 tools for Calendar, Gmail, and Drive, plus a Google OAuth provider.

**OAuth** — `@loopstack/oauth` provides a provider-agnostic OAuth 2.0 framework. Providers self-register at startup, tokens are stored in Redis for multi-instance deployments, and auto-refresh is built in.

**MCP** — `@loopstack/mcp` is a client for remote MCP servers. It comes with strict security defaults: hostname allowlists, HTTPS enforcement, public IP validation, and no embedded credentials.

**Web** — `@loopstack/web` adds a `WebFetchTool` that fetches URLs, converts HTML to Markdown, and optionally summarizes content.

**Human-in-the-Loop** — `@loopstack/hitl` gained `AskClarificationTool` and `AskForApprovalTool` for pausing workflows to get user input mid-execution.

**Secrets** — `@loopstack/secrets` was extracted from core into its own registry module with tools for requesting and listing secrets.

**Quota** — `@loopstack/quota` provides opt-in, Redis-backed cost metering with token-based pricing calculators for Claude and OpenAI models.

**Remote Client** — `@loopstack/remote-client` ships 10 tools for file operations, shell commands, and app management on remote workspaces.

Each module has comprehensive documentation, tests, and example workflows.

## Workflow Resilience

Production workflows fail. Now they can recover.

**Retry & Timeout** — Transition decorators accept retry strategies (fixed or exponential backoff) and timeout configuration. A failed HTTP call can automatically retry three times with exponential backoff before giving up.

**Cancellation** — `cancel()` and `cancelChildren()` propagate through the workflow tree, recursively cleaning up sub-workflows. Parent workflows get notified when children fail or get canceled, not just when they complete.

**Error Tracking** — Delegate tool calls now aggregate errors from sub-workflows with `errorCount`, `hasErrors`, and `errors` properties. You can inspect exactly which child failed and why.

**Parallel Scheduling** — `@Scheduled({ parallel: true })` enables concurrent sub-workflow execution, with a `WorkspaceLockService` to prevent race conditions.

## Unified Widgets and UI Actions

The old split between `actions` and `form` in the UI schema has been replaced with a unified `widgets` array. Widgets can be assigned at the transition level, giving you precise control over what the user sees at each step.

New document renderers support choices, confirmation prompts, text inputs, and secret fields — all rendered directly in the Studio without custom frontend code.

## Studio, Redesigned

The Studio frontend went through a complete overhaul:

- **Sidebar navigation** replaces the old top dropdown menu, with customizable header and footer
- **Runs management** with a full list page, filtering, sorting, and a "New Run" dialog
- **Multi-panel workbench** with an icon sidebar toggling Files, Logs, Flow, Preview, Secrets, Runs, and Environment panels
- **IDE-style file tabs** with context menus and unsaved-change indicators
- **Remote file explorer** for browsing files on deployed environments
- **Real-time logs panel** streaming execution output
- **Environment management** for controlling remote environments from the workbench
- **Error boundaries and 404 pages** for proper error handling

The architecture was refactored into 8 feature modules with barrel exports, centralized query key management, and a registry-based document rendering system. A `ComponentOverridesProvider` lets embedders customize the sidebar, header, and other components.

## Production Infrastructure

Several changes make Loopstack ready for real deployments:

**Environments** — Apps now support multiple environments with per-environment configuration. Workflows access the current environment through `this.ctx.app.environments`.

**Role-Based Access Control** — A `@Roles()` decorator and `RolesGuard` enforce authorization at the API level, with a `RoleName` enum for predefined roles.

**JWKS Authentication** — Remote apps validate hub tokens via a JWKS endpoint instead of direct service calls. Apps can run independently and validate tokens from a public key set.

**API Contracts** — New `@loopstack/contracts/api` interfaces provide a single source of truth for all API entities. The Studio migrated to a custom API client built on these contracts.

**Block Config Caching** — Config resolution moved from request-time to startup-time, eliminating repeated metadata reflection on every API call.

## Simpler Onboarding

The old CLI scaffolding (`create-loopstack-app`, installer, generators) has been removed in favor of a straightforward NestJS setup. Docker Compose files are bundled for local infrastructure (PostgreSQL, Redis). You set up a standard NestJS project, add `LoopstackModule.forRoot()`, and you're running.

## Wrapping Up

This release transforms Loopstack from a workflow engine into a platform. Multi-provider AI, a generic agent loop, a rich module ecosystem, production-grade resilience, and a Studio that feels like a proper development environment. Whether you're building a simple automation or a complex multi-agent system, the framework now has the pieces you need.

_— Your Loopstack Team_

---

Ready to join the conversation? Check out our [GitHub](https://github.com/loopstack-ai/loopstack), connect with us on [Discord](https://discord.gg/svAHrkxKZg), and follow our journey on [LinkedIn](https://www.linkedin.com/company/loopstack-ai/).
