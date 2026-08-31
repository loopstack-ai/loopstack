---
title: Getting Started
description: Step-by-step setup guide — install prerequisites, scaffold a NestJS app, add LoopstackModule, configure Docker Compose for PostgreSQL and Redis, and run your first workflow.
---

# Getting Started

Get Loopstack running locally in a few minutes.

## Prerequisites

- Node.js 18.0+
- Docker
- NestJS CLI (`npm install -g @nestjs/cli`)

## 1. Create Your App

Scaffold a standard NestJS project and install the Loopstack module:

```shell
nest new my-app
cd my-app
npm install @loopstack/loopstack-module
```

## 2. Provide Postgres & Redis

Loopstack needs a PostgreSQL and a Redis instance. There are two equally good ways to provide them — pick whichever fits your setup:

**Option A — Docker (quickest locally).** Start Postgres and Redis:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

Want the visual [Studio](../learn/studio.md) UI too? Start it alongside — it's a separate, optional compose file:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.studio.yml up -d
```

Studio will be available at [http://localhost:5173](http://localhost:5173).

**Option B — Bring your own.** Point the app at any existing Postgres and Redis (managed, hosted, or already running) via `.env`:

```dotenv
DATABASE_URL=postgres://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
```

> Automated environments — CI and coding agents — should use Option B (point the URLs at an available instance) and drive workflows from the [CLI](../reference/cli.md), not the browser-based Studio.

## 3. Configure

Add `LoopstackModule` to the imports in `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [LoopstackModule.forRoot()],
})
export class AppModule {}
```

Enable shutdown hooks in `src/main.ts` so the workflow engine shuts down gracefully — on SIGTERM (a deploy, `docker stop`) in-flight transitions finish before the process exits:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
```

Add YAML asset bundling to `nest-cli.json` so workflow UI configs are included in the build:

```json
{
  "compilerOptions": {
    "assets": ["**/*.yaml"]
  }
}
```

## 4. Run

```shell
npm run start:dev
```

Your backend is now running at [http://localhost:3000](http://localhost:3000). You can drive workflows two ways: from the terminal with the [CLI](../reference/cli.md) — the fastest loop, and what CI and coding agents should use — or visually in [Studio](../learn/studio.md) if you started it in step 2. We'll use both in the next step.

## 5. Hello World

Create a simple workflow that calls an LLM to greet you by name. First install the Claude and LLM provider modules:

```shell
npm install @loopstack/claude-module @loopstack/llm-provider-module
```

Create `src/hello/hello.workflow.ts`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';

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

  @Transition({ to: 'end' })
  async greet(_state: unknown, ctx: RunContext<InputArgs>) {
    await this.llmGenerateText.call({
      prompt: `Say hello to ${ctx.args.name} in a fun way in one sentence.`,
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

Restart the dev server, then run the workflow either way:

**From the terminal (CLI):**

```shell
npx @loopstack/cli run hello --arg name=You
```

The CLI streams each transition, the LLM tokens, and the final result live — no login needed against the local backend — and returns CI-friendly exit codes.

**In the browser (Studio):** open [http://localhost:5173](http://localhost:5173), find the **Hello World App**, start a new run, and enter your name.

Either way, the LLM greets you by name.

## Next steps

- [Core Concepts](../learn/core-concepts.md) — understand workflows, tools, documents, and providers
- [Creating Workflows](./fundamentals/workflows.md) — transitions, guards, state, and wait patterns
- [AI Text Generation](./ai/text-generation.md) — add LLM calls to your workflows

## zod version (reference)

Loopstack requires **zod v4** — it uses the v4-only `z.toJSONSchema()` API to turn workflow input schemas into JSON Schema. npm 7+ installs it automatically as a peer dependency when you run `npm install @loopstack/loopstack-module`, so you don't normally need to install it yourself. Older tutorials may show `zod@^3`; that won't resolve against Loopstack's peer constraint and `npm install` will fail with `ERESOLVE`.
