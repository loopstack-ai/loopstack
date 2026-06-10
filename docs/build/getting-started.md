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

## 2. Start Infrastructure

Start the Docker environment including PostgreSQL, Redis, and Loopstack Studio:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

Studio will be available at [http://localhost:5173](http://localhost:5173).

If you don't need Studio or want to run it from source:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.infra.yml up -d
```

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

Your backend is now running at [http://localhost:3000](http://localhost:3000) and Studio is available at [http://localhost:5173](http://localhost:5173).

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

  @Transition({ to: 'end' })
  async greet(_state: unknown, ctx: RunContext) {
    const args = ctx.args as InputArgs;
    const result = await this.llmGenerateText.call({
      prompt: `Say hello to ${args.name} in a fun way in one sentence.`,
    });
    await this.documentStore.save(LlmMessageDocument, result.data!.message);
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

Restart the dev server. Open Studio at [http://localhost:5173](http://localhost:5173) — you'll see the **Hello World App**. Start a new run, enter your name, and the LLM will greet you.

## Next steps

- [Core Concepts](../learn/core-concepts.md) — understand workflows, tools, documents, and providers
- [Creating Workflows](./fundamentals/workflows.md) — transitions, guards, state, and wait patterns
- [AI Text Generation](./ai/text-generation.md) — add LLM calls to your workflows
