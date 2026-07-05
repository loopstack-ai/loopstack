# Loopstack App

This is a [Loopstack](https://loopstack.ai) app — a NestJS backend where AI workflows are code: state machines with explicit transitions, typed documents, and tools, all observable in Studio and from the CLI.

## Where things live

- `src/app.module.ts` — mounts `LoopstackModule.forRoot()` plus your app modules
- `src/hello/` — a complete example: `hello.module.ts` (`@StudioApp` groups workflows into an app) and `hello.workflow.ts` (a minimal workflow)
- `docker-compose.yml` — Postgres, Redis, and Studio (http://localhost:5173)
- `.env` — configuration; add API keys here when a module needs them

## The feedback loop — use the CLI, not guesswork

The `loopstack` CLI talks to the running backend (`npm run start:dev`, http://localhost:3000):

```bash
loopstack list                        # what can be run right now
loopstack run <workflow> --arg k=v    # run it, streamed live; --json for machine-readable output
loopstack runs                        # recent runs, waiting-for-input first
loopstack runs <run-id> --follow      # audit trail; reattach to a waiting run and answer prompts
loopstack watch --json                # NDJSON event firehose while you develop
```

Exit codes: `0` completed, `1` failed, `2` connection/config error, `3` waiting for input in a non-interactive shell. After changing code, the dev server reloads automatically — rerun the workflow to verify.

## Writing workflows

Follow `src/hello/hello.workflow.ts` as the canonical example:

- A workflow is a class with `@Workflow({ title, description, schema })` extending `BaseWorkflow<Args>` (the zod `schema` types and validates its args); register it in the `@StudioApp` module.
- Transitions are methods with `@Transition({ to: 'x' })` (initial, `from` defaults to `'start'`) or `@Transition({ from: 'x', to: 'end' })` (final). Signatures: `(state, ctx)` for automatic transitions, `(state, payload, ctx)` for wait transitions. Workflow args are on `ctx.args`.
- Transitions return nothing — mutate via `this.assignState(partial)` and publish results via `this.assignResult(partial)`. Use `async` only when the body awaits.
- Documents are classes with `@Document({ schema })` (zod) saved via `this.documentStore.save(SomeDocument, data)` — they are what Studio renders.
- Tools are NestJS providers with `@Tool({ name })`, implementing `protected async handle(args, ctx, options?): Promise<ToolEnvelope>`.

## Learning more

- Docs: https://loopstack.ai/docs — for agents, the full corpus is at https://loopstack.ai/llms.txt (route via titles, fetch what you need)
- Registry of feature modules and examples (LLM providers, HITL prompts, agents, git, secrets, sandboxes): https://loopstack.ai/registry — each package README has an installation section; prefer adapting a registry example over building from scratch
- CLI reference: https://loopstack.ai/docs/reference/cli
