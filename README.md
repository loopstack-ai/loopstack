# Loopstack

[//]: # '[![Version](https://img.shields.io/badge/version-alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)'

[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

**The AI Framework for TypeScript.**

Loopstack is a TypeScript workflow framework for building stateful automations, AI agents, and interactive workflows — directly in your NestJS backend.

## What You Can Build

- **AI Workflows** — Stateful automations that chain tools, transform data, and route dynamically
- **AI Agents** — AI agent harnesses with tool calling, context management, and message history
- **Orchestration Systems** — Compose complex systems by spawning nested agents and workflows
- **Secure Execution** — Run code and access files in isolated sandboxed environments
- **HITL Systems** — Pause workflows for Human-in-the-Loop review, input, or confirmation

...built directly into your NestJS backends.

## How It Works

Loopstack apps are built from three core concepts:

- **Workflows** — TypeScript classes that define a state machine with transitions, guards, and routing
- **Tools** — Reusable logic units called directly in your workflows
- **Documents** — Structured data objects displayed in the Loopstack Studio UI

## Key Benefits

- **Agentic Meets Deterministic** — Drop an LLM call into any point in a deterministic workflow, or nest agents inside structured pipelines. One system, not two bolted together.
- **Built-in Human Interaction** — Approvals, forms, confirmations, and clarifications ship as framework primitives. Pause for human input for hours or days and resume cleanly.
- **Responsible AI** — Every state transition, tool call, and LLM decision is recorded. State is checkpointed so failures resume cleanly. Explicit state machines make workflows auditable and easy to reason about.
- **Framework, Not a Platform** — Extend it like any NestJS app — add your own modules, providers, and entities. No vendor lock-in, no external execution engine.

## Getting Started

### Prerequisites

- Node.js 18.0+
- Docker
- NestJS CLI (`npm install -g @nestjs/cli`)

### 1. Create Your App

```shell
nest new my-app
cd my-app
npm install @loopstack/loopstack-module
```

### 2. Start Infrastructure

Start the Docker environment including PostgreSQL, Redis, and Loopstack Studio:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

Studio will be available at http://localhost:5173.

If you don't need Studio or want to run it from source:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.infra.yml up -d
```

### 3. Configure

Add `LoopstackModule` to the imports in `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot()],
})
export class AppModule {}
```

Add YAML asset bundling to `nest-cli.json` so workflow UI configs are included in the build:

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

### 5. Hello World

Create a simple workflow that calls an LLM to greet you by name. First install the Claude and LLM provider modules:

```shell
npm install @loopstack/claude-module @loopstack/llm-provider-module
```

Create `src/hello/hello.workflow.ts`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

const InputSchema = z.object({
  name: z.string().default('World'),
});

type InputArgs = z.infer<typeof InputSchema>;

@Workflow({
  title: 'Hello World',
  description: 'A simple workflow that greets you by name using an LLM.',
  schema: InputSchema,
})
export class HelloWorkflow extends BaseWorkflow<InputArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ from: 'start', to: 'message_received' })
  async greet(_state: unknown, ctx: RunContext<InputArgs>) {
    await this.llmGenerateText.call({
      prompt: `Say hello to ${ctx.args.name} in a fun way in one sentence.`,
    });
  }

  @Transition({ from: 'message_received', to: 'end' })
  async saveMessage() {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: 'Bye.',
    });
  }
}
```

Create `src/hello/hello.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'Hello World App',
  workflows: [HelloWorkflow],
})
@Module({
  imports: [ClaudeModule, LlmProviderModule.forFeature({ model: 'claude-sonnet-4-5' })],
  providers: [HelloWorkflow],
})
export class HelloModule {}
```

Register it in `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [LoopstackModule.forRoot(), HelloModule],
})
export class AppModule {}
```

Set your Anthropic API key in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the dev server. Open Studio at http://localhost:5173 — you'll see the **Hello World App**. Start a new run, enter your name, and the LLM will greet you.

## Community Registry

Ready-made tools, integrations, and example workflows. Install via npm:

```shell
npm install @loopstack/<package-name>
```

Then import the module in your NestJS app. Browse available packages at [loopstack.ai/registry](https://loopstack.ai/registry).

## Next Steps

- [Core Concepts](https://loopstack.ai/docs/learn/core-concepts) — understand workflows, tools, documents, and providers
- [Creating Workflows](https://loopstack.ai/docs/build/fundamentals/workflows) — transitions, guards, state, and wait patterns
- [AI Text Generation](https://loopstack.ai/docs/build/ai/text-generation) — add LLM calls to your workflows

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
