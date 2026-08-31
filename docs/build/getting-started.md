---
title: Getting Started
description: Scaffold a new Loopstack app with `loopstack create` — it generates a NestJS backend, a zero-config hello workflow, a Docker Compose file for PostgreSQL and Redis (plus an optional one for Studio), a ready-to-edit .env, and a CLAUDE.md. Then run your first workflow from the terminal with `loopstack run`, or point DATABASE_URL / REDIS_URL at your own instances.
---

# Getting Started

The fastest way to start is `loopstack create` — it scaffolds a complete, runnable app so you can run your first AI workflow in a couple of minutes. Already have a NestJS project? See [Add to an Existing App](./add-to-existing-app.md) instead.

## Prerequisites

- Node.js 18.0+
- Docker — optional, only for the one-command local Postgres + Redis (you can [bring your own](#2-provide-postgres--redis) instead)

## 1. Create your app

```shell
npx @loopstack/cli create my-app
cd my-app
```

`create` scaffolds a fresh NestJS backend with `LoopstackModule.forRoot()` wired in and a zero-config `hello` workflow under `src/hello/`. It also drops in:

- `docker-compose.yml` — Postgres + Redis
- `docker-compose.studio.yml` — the optional [Studio](../learn/studio.md) UI
- `.env` — configuration; the defaults match the Docker services out of the box
- `CLAUDE.md` — conventions and the CLI feedback loop for coding agents
- an initialized git repository

## 2. Provide Postgres & Redis

Loopstack needs a PostgreSQL and a Redis instance. There are two equally good ways to provide them — pick whichever fits your setup:

**Option A — Docker (quickest locally).** From the project root:

```shell
docker compose up -d
```

This starts Postgres and Redis with settings that match the scaffolded `.env`. Want the visual Studio UI too? Start it alongside — it's the separate, optional compose file:

```shell
docker compose -f docker-compose.studio.yml up -d      # Studio on http://localhost:5173
```

**Option B — Bring your own.** Point the app at any existing Postgres and Redis (managed, hosted, or already running) in `.env`:

```dotenv
DATABASE_URL=postgres://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
```

> CI and coding agents should use Option B (point the URLs at an available instance) and drive workflows from the [CLI](../reference/cli.md), not the browser-based Studio.

## 3. Run

Start the backend:

```shell
npm run start:dev        # http://localhost:3000
```

Then run the scaffolded workflow from the terminal — the CLI talks to the local backend with no login:

```shell
loopstack run hello --arg name=You
```

It streams each transition and the final result live, and returns CI-friendly exit codes — the fastest loop for iterating, scripting, and coding agents. Prefer a visual UI? Start Studio (step 2) and open [http://localhost:5173](http://localhost:5173).

## What you got

The `hello` workflow lives in `src/hello/hello.workflow.ts` — one class with a single transition:

```typescript
@Workflow({
  title: 'Hello World',
  description: 'Greets you by name — replace this with your first real workflow.',
  schema: z.object({ name: z.string().default('World') }),
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

It's zero-config — no API keys needed for this first run. Edit it, add your own workflows beside it, and rerun with the CLI to see them live. To make a workflow call an LLM, see [AI Text Generation](./ai/text-generation.md).

## Next steps

- [Core Concepts](../learn/core-concepts.md) — workflows, tools, documents, and providers
- [Creating Workflows](./fundamentals/workflows.md) — transitions, guards, state, and wait patterns
- [AI Text Generation](./ai/text-generation.md) — add LLM calls to your workflows
- [Add to an Existing App](./add-to-existing-app.md) — wire Loopstack into a NestJS project you already have
