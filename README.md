# Loopstack AI

[//]: # '[![Version](https://img.shields.io/badge/version-alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)'

[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

**The AI Workflow Framework for TypeScript.**

A complete TypeScript framework built on NestJS + React. Combine agentic loops and deterministic workflows in one state machine powered system, integrate anywhere, with built-in user interface, pause for human input, and resume from where you left off.

## Key Benefits

- **Agentic Meets Deterministic** — Drop an LLM call into any point in a deterministic workflow, or nest agents inside structured pipelines. One system, not two bolted together.
- **State Machine Workflows** — Explicit states and transitions with formal guarantees about valid paths, making workflows easy to reason about, debug, and visualize.
- **Persistent State** — Every step is checkpointed to the database. If a process fails, resume from the last successful state.
- **Built-in Human Interaction** — Approvals, forms, confirmations, and clarifications ship as framework primitives. Pause for human input for hours or days and resume cleanly.
- **Full-Stack on NestJS + React** — Dependency injection, modules, guards, and a massive ecosystem out of the box. The React frontend ships end-user applications, not just backend pipelines.
- **Full Traceability** — Every state transition, tool call, and LLM decision is recorded. Replay any execution step by step and pinpoint exactly where things went wrong.
- **Ready-Made Registry** — Install production-grade tools and workflow templates with a single command. AI providers, OAuth flows, sandboxed code execution, and more.
- **Nested Sub-Workflows** — Break complex processes into composable sub-workflows that run independently and report back, each with its own state, tools, and lifecycle.
- **Framework, Not a Platform** — Extend it like any NestJS app. No vendor lock-in, no external execution engine.

## Composable Building Blocks

- **Workflows** — TypeScript state machines with explicit states and transitions. Mix agentic LLM calls with deterministic steps in the same flow. Pause for human input, and state is checkpointed after every step.
- **Tools** — Reusable units of logic with Zod-validated inputs. Inject them into workflows for deterministic steps, or expose them to LLMs so agents can decide when to call them.
- **Documents** — Typed data objects that bridge your workflow and the UI. Define a Zod schema and they render automatically as forms, messages, or structured output in Loopstack Studio.
- **UI Configuration** — YAML files configure the user-facing interface — forms, buttons, chat inputs, and interactive widgets. Widgets appear and disappear based on the current workflow state. No frontend code needed.

## Getting Started

### Prerequisites

- Node.js 18.0+
- Docker
- NestJS CLI (`npm install -g @nestjs/cli`)

### 1. Start Infrastructure

```shell
curl -fOL https://loopstack.ai/docker-compose.yml
docker compose up -d
```

This starts PostgreSQL, Redis, and Loopstack Studio.

### 2. Create Your App

```shell
nest new my-app
cd my-app
npm install @loopstack/loopstack-module
```

### 3. Configure

Add `LoopstackModule` to your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot()],
})
export class AppModule {}
```

Add YAML asset bundling to `nest-cli.json`:

```json
{
  "compilerOptions": {
    "assets": ["**/*.yaml"]
  }
}
```

### 4. Run

```shell
npm run start:dev
```

Your backend runs at http://localhost:3000 and Studio is available at http://localhost:5173.

### 5. Verify Your Setup

Follow the [Hello World Workflow](https://loopstack.ai/docs/getting-started/hello-world) guide to create a simple workflow and see it running in Studio.

## Community Registry

Ready-made tools, integrations, and example workflows. Install via npm:

```shell
npm install @loopstack/<package-name>
```

Then import the module in your NestJS app. Browse available packages at [loopstack.ai/registry](https://loopstack.ai/registry).

## Useful Links

- **Documentation**: [loopstack.ai/docs](https://loopstack.ai/docs)
- **Discord Community**: [discord.gg/loopstack](https://discord.gg/svAHrkxKZg)
- **Bug Reports**: [GitHub Issues](https://github.com/loopstack-ai/loopstack/issues)

## License

**MIT License**

Free for personal and commercial use — build apps, modify code, sell products. No restrictions.

For details see: [LICENSE](LICENSE)

---

**Built with ❤️ by the Loopstack team**

[Website](https://loopstack.ai) · [Documentation](https://loopstack.ai/docs) · [GitHub](https://github.com/loopstack-ai/loopstack)
