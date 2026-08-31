---
title: Add to an Existing App
description: Add Loopstack to an existing NestJS project by hand — install @loopstack/loopstack-module, register LoopstackModule.forRoot(), enable shutdown hooks, bundle YAML assets in nest-cli.json, provide PostgreSQL and Redis (Docker Compose or DATABASE_URL/REDIS_URL), and write your first workflow. Covers the zod v4 peer-dependency requirement.
---

# Add to an Existing App

Already have a NestJS backend? Wire Loopstack into it directly. Starting fresh instead? [`loopstack create`](./getting-started.md) scaffolds all of this — module, config, a hello workflow, Docker Compose, and a `.env` — in one command.

## 1. Install the module

```shell
npm install @loopstack/loopstack-module
```

## 2. Register the module

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

## 3. Provide Postgres & Redis

Loopstack needs a PostgreSQL and a Redis instance. There are two equally good ways to provide them:

**Option A — Docker (quickest locally).** The module ships a Compose file for Postgres and Redis:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

Want the visual [Studio](../learn/studio.md) UI too? Start it alongside — it's a separate, optional compose file:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.studio.yml up -d
```

**Option B — Bring your own.** Point the app at any existing Postgres and Redis (managed, hosted, or already running) via `.env`:

```dotenv
DATABASE_URL=postgres://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
```

> CI and coding agents should use Option B (point the URLs at an available instance) and drive workflows from the [CLI](../reference/cli.md), not the browser-based Studio.

## 4. Write your first workflow

Create `src/hello/hello.workflow.ts` — a single class with one transition:

```typescript
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const InputSchema = z.object({
  name: z.string().default('World'),
});

type InputArgs = z.infer<typeof InputSchema>;

@Workflow({
  title: 'Hello World',
  description: 'Greets you by name — replace this with your first real workflow.',
  schema: InputSchema,
})
export class HelloWorkflow extends BaseWorkflow<InputArgs> {
  @Transition({ from: 'start', to: 'end' })
  async greet(_state: unknown, ctx: RunContext<InputArgs>) {
    const greeting = `Hello, ${ctx.args.name}! 👋`;
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: greeting });
    this.assignResult({ greeting });
  }
}
```

Create `src/hello/hello.module.ts` — `@StudioApp` groups workflows into an app:

```typescript
import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'My First App',
  workflows: [HelloWorkflow],
})
@Module({
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

## 5. Run

```shell
npm run start:dev        # http://localhost:3000
```

Run the workflow from the terminal — the CLI talks to the local backend with no login:

```shell
npx @loopstack/cli run hello --arg name=You
```

It streams each transition and the result live, and returns CI-friendly exit codes. Prefer a visual UI? Start Studio (step 3) and open [http://localhost:5173](http://localhost:5173).

This first workflow is zero-config — no API keys needed. To make a workflow call an LLM, see [AI Text Generation](./ai/text-generation.md).

## Next steps

- [Core Concepts](../learn/core-concepts.md) — workflows, tools, documents, and providers
- [Creating Workflows](./fundamentals/workflows.md) — transitions, guards, state, and wait patterns
- [AI Text Generation](./ai/text-generation.md) — add LLM calls to your workflows

## zod version (reference)

Loopstack requires **zod v4** — it uses the v4-only `z.toJSONSchema()` API to turn workflow input schemas into JSON Schema. npm 7+ installs it automatically as a peer dependency when you run `npm install @loopstack/loopstack-module`, so you don't normally need to install it yourself. Older tutorials may show `zod@^3`; that won't resolve against Loopstack's peer constraint and `npm install` will fail with `ERESOLVE`.
