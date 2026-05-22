# Loopstack

[//]: # '[![Version](https://img.shields.io/badge/version-alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)'

[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

**The AI Framework for TypeScript.**

Loopstack is a TypeScript workflow framework for building stateful automations, AI agents, and interactive workflows — directly in your NestJS backend.

## What You Can Build

- **AI Agents** — Agent harnesses with tool calling, context management, and message history
- **AI Workflows** — Stateful automations that chain tools, transform data, and route dynamically
- **Orchestration Systems** — Compose complex systems by spawning nested agents and workflows
- **Secure Execution** — Run code and access files in isolated sandboxed environments
- **HITL Systems** — Pause workflows for human review, input, or confirmation

...built directly into your NestJS backends.

## How It Works

- **Workflows** — TypeScript classes that define a state machine with transitions, guards, and routing
- **Tools** — Reusable logic units called directly in your workflows or exposed to LLMs for agent tool calling
- **Documents** — Structured data objects displayed in the Loopstack Studio UI

## Key Benefits

- **Agentic Meets Deterministic** — Drop an LLM call into any point in a deterministic workflow, or nest agents inside structured pipelines. One system, not two bolted together.
- **Built-in Human Interaction** — Approvals, forms, confirmations, and clarifications ship as framework primitives. Pause for human input for hours or days and resume cleanly.
- **Responsible AI** — Every state transition, tool call, and LLM decision is recorded. State is checkpointed so failures resume cleanly. Explicit state machines make workflows auditable and easy to reason about.
- **Framework, Not a Platform** — Extend it like any NestJS app — add your own modules, providers, and entities. No vendor lock-in, no external execution engine.

## Getting Started

### Prerequisites

- Node.js 22.0+
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
