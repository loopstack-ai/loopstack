# Loopstack

[//]: # '[![Version](https://img.shields.io/badge/version-alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)'

[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

**Your Modular AI Stack**

Loopstack is a TypeScript framework based on NestJS for building AI agents and durable AI workflows — built
for professional use.

Open Source · TypeScript · NestJS · Studio & CLI

## What You Build

Stateful AI agents and workflows that **call your tools**, **coordinate sub-agents**, and **pause for human
input**:

- Knowledge retrieval
- Research & summarization
- Data analysis
- Fact-checking
- Coding automation
- Content & doc pipelines
- Agent harness

## How It Works

Loopstack apps are built from three core concepts:

- **Workflows** — TypeScript classes that define a state machine with transitions, guards, and routing
- **Tools** — Reusable logic units called directly in your workflows
- **Documents** — Structured data objects, rendered by Studio and the CLI

Trigger them from anywhere in your NestJS app: a controller, a queue consumer, or a scheduled job.

## Getting Started

The fastest way to start is `loopstack create` — it scaffolds a complete, runnable app so you can run your first AI workflow in a couple of minutes. Already have a NestJS project? See [Add to an Existing App](https://loopstack.ai/docs/build/add-to-existing-app) instead.

### Prerequisites

- **Node.js 24 LTS** (recommended)
- Node.js 20.19+ or 22 LTS with npm 11 (`npm i -g npm@11`)
- Docker

### 1. Create your app

```shell
npx @loopstack/cli create my-app
cd my-app
```

`create` scaffolds a fresh NestJS backend with `LoopstackModule.forRoot()` wired in and a zero-config `hello` workflow under `src/hello/`. It also drops in:

- `docker-compose.yml` — Postgres + Redis
- `docker-compose.studio.yml` — the optional [Studio](https://loopstack.ai/docs/learn/studio) UI
- `.env` — configuration; the defaults match the Docker services out of the box
- `CLAUDE.md` — conventions and the CLI feedback loop for coding agents
- an initialized git repository

### 2. Provide Postgres & Redis

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

> CI and coding agents should use Option B (point the URLs at an available instance) and drive workflows from the [CLI](https://loopstack.ai/docs/reference/cli), not the browser-based Studio.

### 3. Run

Start the backend:

```shell
npm run start:dev        # http://localhost:3000
```

Then run the scaffolded workflow from the terminal — the CLI talks to the local backend with no login:

```shell
loopstack run hello --arg name=You
```

It streams each transition and the final result live, and returns CI-friendly exit codes — the fastest loop for iterating, scripting, and coding agents. Prefer a visual UI? Start Studio (step 2) and open [http://localhost:5173](http://localhost:5173).

### What you got

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

It's zero-config — no API keys needed for this first run. Edit it, add your own workflows beside it, and rerun with the CLI to see them live. To make a workflow call an LLM, see [AI Text Generation](https://loopstack.ai/docs/build/ai/text-generation).

## Run It From the Terminal or the Browser

**CLI** — `npm i -g @loopstack/cli`, and every workflow is a command. Runs stream live: transitions, LLM
tokens, tool calls, and human-in-the-loop prompts answered right in your terminal.

- CI-ready with JSON output & exit codes
- Operable by AI agents
- Attach to any running workflow

**Studio** — run, debug, and organize automations in the built-in frontend. Forms, documents, and live
progress render from your workflow's config — no frontend code required.

## Features

- **Durable Execution** — Every step is checkpointed. Kill the process or redeploy mid-run — it resumes
  right where it left off.
- **Human-in-the-Loop** — Pause for approvals, forms, or input — then continue the moment a human responds,
  minutes or days later.
- **Automated Testing** — Test whole runs with recorded LLM responses and scripted human answers. Fast,
  deterministic, CI-ready.
- **Observability** — Every transition, tool call, and document recorded — inspect any run from Studio or
  the terminal.
- **Agents & Sub-workflows** — Compose systems from nested agents and sub-workflows, with tool calling and
  error recovery built in.

[Explore all features](https://loopstack.ai/features)

## Community Registry

Install ready-made tools, agents, and workflows from the registry — copy, adapt, and own the source:

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

**Build for AI by the Loopstack Team**

[Website](https://loopstack.ai) · [Documentation](https://loopstack.ai/docs) · [GitHub](https://github.com/loopstack-ai/loopstack)
