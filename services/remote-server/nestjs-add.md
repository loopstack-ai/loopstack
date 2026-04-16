# NestJS Dual-App Setup — remote-agent

Documents the current working setup: NestJS custom app (public, port 3000) + agent (internal, port 3001) in a single Fly machine.

## Architecture

- **NestJS app** — port 3000, mapped to external 80/443 via `.fly.dev`
- **Agent** — port 3001, internal (Fly services config exposes it but `.fly.dev` won't route non-standard ports)
- **Agent manages NestJS** — the agent spawns NestJS as a child process using `child_process.spawn`, piping stdout/stderr to container logs
- **Pre-built** — NestJS is compiled during Docker build (`npm run build`), runs via `node --enable-source-maps dist/main.js` for instant startup with dev-quality stack traces

## Process Lifecycle

1. Container starts → `start.sh` runs `exec node dist/index.js` (agent)
2. Agent listens on port 3001, then calls `spawnNestApp()`
3. `spawnNestApp()` spawns `node --enable-source-maps dist/main.js` in `/app/custom-app`
4. If NestJS crashes unexpectedly, agent exits too → Fly restarts container
5. Deliberate restarts (via `/app/restart` or `/app/rebuild`) use `isRestarting` flag to prevent agent exit

## Agent Endpoints

- `POST /app/rebuild` — runs `npm run build` in custom-app (old process keeps serving), then kills old + spawns new
- `POST /app/restart` — kills old NestJS process + spawns new (no rebuild)
- `GET /app/status` — returns `{ running, pid, restarting }`

## Key Learnings

- **IP allocation is required** for `.fly.dev` DNS to work when creating apps via the Machines API. Allocate both shared IPv4 and IPv6 via the GraphQL API (`https://api.fly.io/graphql`).
- **NestJS default binds to 127.0.0.1** — must patch `main.ts` to listen on `0.0.0.0` for Fly's proxy to reach it.
- **`node:20-slim` uses `dash` as `/bin/sh`** — `wait -n` is bash-only; use a simple exec instead.
- **Healthcheck should only check the agent** (port 3001), not NestJS (port 3000), to avoid restarts during NestJS compilation.
- **Machine memory**: 1024MB recommended for runtime TypeScript compilation (rebuild endpoint).
- **Source maps**: `node --enable-source-maps` gives dev-quality stack traces from pre-built dist files. NestJS Logger works identically whether running from source or dist.

## Current Files

### `Dockerfile`

- Build stage: compiles agent, scaffolds NestJS app with `nest new`, patches `main.ts` for `0.0.0.0` binding, pre-builds NestJS (`npm run build`)
- Runtime stage: copies full NestJS app (source + deps + dist), agent dist + prod deps
- No global `@nestjs/cli` needed in runtime — `npm run build` uses local `node_modules/.bin/nest`

### `start.sh`

- Single line: `exec node dist/index.js` — agent manages NestJS as child process

### `src/routes/app.ts`

- `spawnNestApp()` — exported, spawns NestJS child process with source maps enabled
- `killNestApp()` — SIGTERM with 5s SIGKILL fallback
- `POST /rebuild` — build first, then swap (zero-downtime rebuild)
- `POST /restart` — restart without rebuilding
- `GET /status` — process status check

### `src/index.ts`

- Mounts `/app` router, calls `spawnNestApp()` after agent starts listening

### Machine config (`fly-api.service.ts`)

Two services:

1. Ports 80/443 → internal 3000 (NestJS, public)
2. Port 3001 → internal 3001 (agent)

### Provisioning (`fly-provisioning.service.ts`)

- `AGENT_PORT` env var set to 3001
- `WORKSPACE_ROOT` env var set to `/app/custom-app`
- `agentUrl` uses `https://<app>.fly.dev:<agentPort>` (TODO: won't work via `.fly.dev`, needs private networking or dedicated IP)
