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

Create a simple workflow to verify your setup. Create `src/hello/hello.workflow.ts`:

```typescript
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';

interface HelloState {
  name?: string;
}

@Workflow({
  title: 'Hello World',
  description: 'A simple workflow that greets you by name.',
  schema: z.object({
    name: z.string().default('World'),
  }),
})
export class HelloWorkflow extends BaseWorkflow<{ name: string }, HelloState> {
  @Transition({ to: 'ready' })
  async start(state: HelloState, ctx: LoopstackContext): Promise<HelloState> {
    const args = ctx.args as { name: string };
    return { name: args.name };
  }

  @Transition({ from: 'ready', to: 'done' })
  async greet(state: HelloState): Promise<HelloState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Hello, ${state.name}!`,
    });
    return state;
  }

  @Transition({ from: 'done', to: 'end' })
  async finish(): Promise<unknown> {
    return {};
  }
}
```

Create `src/hello/hello.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'Hello World App',
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

Restart the dev server. Open Studio at [http://localhost:5173](http://localhost:5173) — you'll see the **Hello World App**. Start a new run, enter your name, and the workflow will greet you.

## Next steps

- [Core Concepts](/docs/learn/core-concepts) — understand workflows, tools, documents, and providers
- [Creating Workflows](/docs/build/fundamentals/workflows) — transitions, guards, state, and wait patterns
- [AI Text Generation](/docs/build/ai/text-generation) — add LLM calls to your workflows
