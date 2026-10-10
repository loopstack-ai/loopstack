# Loopstack Examples

Every Loopstack example in one runnable app. Each theme is a NestJS module under `src/`, registered
as its own `@StudioApp`, so starting this app once gives you all 68 example workflows side by side in
Studio.

Read a module's README to understand a pattern, run its workflow to watch it work, then copy the
directory into your own app — each README names the `@loopstack/*` packages that copy needs.

## Run it

Postgres and Redis have to be reachable. Then:

```bash
cp env.example .env     # optional — add provider keys for the LLM, OAuth and sandbox examples
npm run build
npm start
```

Studio is served at `http://localhost:3000`. Workflows that need no API key, Docker socket, remote
sandbox or OAuth app run as they are; the rest say in their README what they need.

## Modules

| Module                                                            | Directory                  | Workflows |
| ----------------------------------------------------------------- | -------------------------- | --------- |
| [Advanced Workflows Examples](src/advanced-workflows/README.md)   | `src/advanced-workflows/`  | 19        |
| [Agent Examples](src/agent/README.md)                             | `src/agent/`               | 4         |
| [Error Handling Examples](src/error-handling/README.md)           | `src/error-handling/`      | 8         |
| [Git Examples](src/git/README.md)                                 | `src/git/`                 | 2         |
| [GitHub Examples](src/github/README.md)                           | `src/github/`              | 2         |
| [Google Workspace Examples](src/google-workspace/README.md)       | `src/google-workspace/`    | 2         |
| [HITL Examples](src/hitl/README.md)                               | `src/hitl/`                | 9         |
| [Integration Examples (placeholder)](src/integrations/README.md)  | `src/integrations/`        | 0         |
| [LLM Examples](src/llm/README.md)                                 | `src/llm/`                 | 4         |
| [Local File Explorer Examples](src/local-file-explorer/README.md) | `src/local-file-explorer/` | 1         |
| [Observability Examples](src/observability/README.md)             | `src/observability/`       | 4         |
| [Remote Client Examples](src/remote-client/README.md)             | `src/remote-client/`       | 2         |
| [Sandbox Examples](src/sandbox/README.md)                         | `src/sandbox/`             | 1         |
| [Scheduling Examples](src/scheduling/README.md)                   | `src/scheduling/`          | 7         |
| [Secrets Examples](src/secrets/README.md)                         | `src/secrets/`             | 2         |
| [Testing Examples](src/testing/README.md)                         | `src/testing/`             | 1         |

## Tests

```bash
npm test            # in-process workflow tests, no network
npm run test:live   # live LLM check-ups, needs provider credentials
npm run smoke       # boots the built app and drives deterministic workflows through the CLI
```

`npm run sync-deps` regenerates the "Use in Your App" section of every module README from that
module's imports. `npm test` fails when one is out of date.

## Scripts

- `scripts/smoke-run.mjs` — starts `dist/main.js`, runs each workflow in `SMOKE_WORKFLOWS` through
  the `loopstack` CLI and checks how it ends. This is the CI smoke gate.
- `scripts/sdk-demo.mjs` — runs the LLM prompt example through `@loopstack/client` from bare Node,
  streaming transitions and tokens live.
