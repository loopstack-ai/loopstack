---
title: Configuration Reference
description: All LoopstackModule.forRoot() options and environment variables — database, Redis, authentication, CORS (cors, corsOrigins / CORS_ORIGINS / FRONTEND_URL allowlist), event stream tuning (sse.bufferSize / bufferTtlMs / heartbeatIntervalMs), run trace persistence (trace / LOOPSTACK_TRACE), API list page sizes (*_DEFAULT_LIMIT, DOCUMENT_MAX_LIMIT), scheduler concurrency (TASK_CONCURRENCY), LLM provider keys and models (CLAUDE_MODEL, OPENAI_MODEL), feature module settings (WORKSPACE_BASE_PATH, CLAUDE_WEB_FETCH_MODEL, QUOTA_*), and default settings.
---

# Configuration

Loopstack is configured via `LoopstackModule.forRoot()` options and environment variables. Environment variables are read from a `.env` file in your project root.

All settings have sensible defaults — a fresh project works out of the box with no configuration.

> Need finer-grained control over the database connection, config loading, or which submodules are registered? See [Custom Bootstrap](../extend/custom-bootstrap.md) for replacing `LoopstackModule.forRoot()` with its underlying modules.

## `LoopstackModule.forRoot()` Options

```typescript
LoopstackModule.forRoot({
  enableAuth: false,        // default: false (no authentication)
  database: { ... },        // PostgreSQL connection
  redis: { ... },           // Redis connection
  auth: { ... },            // JWT and hub auth settings
  cors: { ... },            // full CORS override
  corsOrigins: [ ... ],     // extra allowed origins for the default CORS policy
  sse: { ... },             // event stream replay buffer and heartbeat
  trace: false,             // default: false (no run trace persistence)
})
```

### `enableAuth`

Enables authentication. When `false` (the default), a local development user is created automatically and no login is required.

| Option       | Env var          | Default |
| ------------ | ---------------- | ------- |
| `enableAuth` | `LOOPSTACK_AUTH` | `false` |

Set `enableAuth: true` or `LOOPSTACK_AUTH=true` to require authentication via Loopstack Hub.

#### Disabling authentication in production (advanced)

Running with authentication disabled means every request resolves to the shared local user, which is convenient for local development but exposes all non-role-gated data and actions to anyone who can reach the server. To prevent an accidental unauthenticated public deployment, Loopstack **refuses to start** when authentication is disabled and `NODE_ENV=production`.

If you intentionally run an unauthenticated instance in production — for example behind a trusted private network or an authenticating proxy — acknowledge it explicitly:

| Env var                   | Default | Effect                                                                                   |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `LOOPSTACK_ALLOW_NO_AUTH` | —       | Set to `true` to allow booting with authentication disabled while `NODE_ENV=production`. |

Outside production, disabling auth only logs a startup warning; no acknowledgment is required.

### `database`

PostgreSQL connection settings. All fields are optional — defaults connect to a local PostgreSQL instance.

| Option                             | Env var             | Default     |
| ---------------------------------- | ------------------- | ----------- |
| `database.host`                    | `DATABASE_HOST`     | `localhost` |
| `database.port`                    | `DATABASE_PORT`     | `5432`      |
| `database.username`                | `DATABASE_USERNAME` | `postgres`  |
| `database.password`                | `DATABASE_PASSWORD` | `admin`     |
| `database.database`                | `DATABASE_NAME`     | `postgres`  |
| `database.reuseExistingConnection` | —                   | `false`     |

Alternatively, set a single **`DATABASE_URL`** (e.g. `postgres://user:password@host:5432/dbname`) — common in managed and hosted environments. When present (and no programmatic `database` options are passed), it takes precedence over the discrete `DATABASE_*` vars.

Set `database.reuseExistingConnection: true` to reuse the host application's **default** TypeORM connection. When enabled, Loopstack skips its own `TypeOrmModule.forRoot()` registration and its repositories resolve against the default connection you registered — which must point at PostgreSQL and load Loopstack's entities (e.g. `autoLoadEntities: true`).

### `redis`

Redis connection settings for BullMQ job queues.

| Option           | Env var          | Default     |
| ---------------- | ---------------- | ----------- |
| `redis.host`     | `REDIS_HOST`     | `localhost` |
| `redis.port`     | `REDIS_PORT`     | `6379`      |
| `redis.password` | `REDIS_PASSWORD` | —           |

Alternatively, set a single **`REDIS_URL`** (e.g. `redis://host:6379`) — common in managed and hosted environments. When present, it takes precedence over the discrete `REDIS_*` vars.

### `auth`

JWT and hub authentication settings. Only relevant when `enableAuth` is `true`.

| Option                      | Env var                  | Default                                          |
| --------------------------- | ------------------------ | ------------------------------------------------ |
| `auth.jwt.secret`           | `JWT_SECRET`             | _required when auth is enabled_                  |
| `auth.jwt.expiresIn`        | `JWT_EXPIRES_IN`         | `1h`                                             |
| `auth.jwt.refreshSecret`    | `JWT_REFRESH_SECRET`     | value of `JWT_SECRET`                            |
| `auth.jwt.refreshExpiresIn` | `JWT_REFRESH_EXPIRES_IN` | `7d`                                             |
| `auth.jwt.cookieDomain`     | `JWT_COOKIE_DOMAIN`      | _unset (host-only cookies)_                      |
| `auth.clientId`             | `CLIENT_ID`              | `local`                                          |
| `auth.hub.issuer`           | `HUB_ISSUER`             | `https://hub.loopstack.ai`                       |
| `auth.hub.jwksUri`          | `HUB_JWKS_URI`           | `https://hub.loopstack.ai/.well-known/jwks.json` |

When `enableAuth` is `true`, `JWT_SECRET` (and `JWT_REFRESH_SECRET`) must be set to a strong, unique value of at least 32 characters — the server refuses to start otherwise, and known/default values are rejected. When auth is disabled, an insecure development secret is used automatically (it never signs trusted tokens, since the local-user shortcut bypasses JWT verification).

`auth.jwt.cookieDomain` sets the `Domain` attribute of the access and refresh cookies. Leave it unset unless a host other than the API must receive them — for example `.example.com` to share them across subdomains. The Studio sends cookies with every API request, so it works with host-only cookies on the API host.

### `cors`

Full CORS override, passed straight to the [`cors`](https://github.com/expressjs/cors#configuration-options) middleware. When set it is used verbatim and `corsOrigins` is ignored. Set to `false` to disable CORS.

When `cors` is not set, a default policy with `credentials: true` is used. It allows:

- requests without an `Origin` header (same-origin navigations and non-browser clients such as `curl` or server-to-server calls);
- any `http://` or `https://` origin on `localhost`, `127.0.0.1` or `[::1]`, on any port;
- the origins listed in [`corsOrigins`](#corsorigins).

Every other origin is rejected, so the browser blocks the response. Local development works without configuration; a deployment that serves Studio or another browser client from its own domain must add that origin to `corsOrigins`.

> Do not set `cors: { origin: true, credentials: true }`. It reflects any origin with credentials, letting every website make authenticated requests to your API on behalf of a signed-in user. Use `corsOrigins` to allow specific origins instead.

### `corsOrigins`

Extra origins allowed by the default CORS policy, in addition to localhost. Ignored when `cors` is set.

| Option        | Env var                                        | Default               |
| ------------- | ---------------------------------------------- | --------------------- |
| `corsOrigins` | `CORS_ORIGINS`, falling back to `FRONTEND_URL` | none (localhost only) |

The env vars are read only when `corsOrigins` is not set or empty, and take a comma-separated list. `FRONTEND_URL` is used only when `CORS_ORIGINS` is not set at all.

Origins are compared exactly against the browser's `Origin` header — scheme, host and port, with no path or trailing slash:

```typescript
LoopstackModule.forRoot({
  corsOrigins: ['https://studio.example.com', 'https://app.example.com:8443'],
});
```

```dotenv
CORS_ORIGINS=https://studio.example.com,https://app.example.com:8443
```

### `sse`

Tuning for the server-sent-events stream at `GET /api/v1/sse`, which Studio and the [TypeScript SDK](client.md#live-events) subscribe to for live updates.

| Option                    | Env var | Default              |
| ------------------------- | ------- | -------------------- |
| `sse.bufferSize`          | —       | `1000`               |
| `sse.bufferTtlMs`         | —       | `300000` (5 minutes) |
| `sse.heartbeatIntervalMs` | —       | `25000` (25 seconds) |

```typescript
LoopstackModule.forRoot({
  sse: { bufferSize: 5000, bufferTtlMs: 15 * 60 * 1000, heartbeatIntervalMs: 15 * 1000 },
});
```

The server keeps recent events in a replay buffer per user and worker. A client that reconnects with a `Last-Event-ID` header (or `lastEventId` query parameter) receives the events it missed. `bufferSize` caps how many events are kept and `bufferTtlMs` how long. When the events after the client's last ID are no longer buffered — evicted, or lost in a server restart — the client receives a single `stream.reset` event instead and has to refetch its state. Raise both if clients reconnect after long gaps.

Every `heartbeatIntervalMs`, the server sends a named `ping` event, which `EventSource.onmessage` consumers never see. It lets non-browser clients detect a dead connection and keeps the stream from looking idle to a reverse proxy — set it below any proxy idle timeout.

### `trace`

Persist every run's [trace](/docs/build/fundamentals/workflows#the-run-trace) — transitions, tool calls with args and result envelopes, documents — as queryable rows, powering `loopstack runs <id> --record` for deriving replay fixtures.

| Option  | Env var           | Default |
| ------- | ----------------- | ------- |
| `trace` | `LOOPSTACK_TRACE` | `false` |

Off by default: the in-memory trace always exists, but nothing is written to the database. Individual runs opt in with `loopstack run <workflow> --trace` (or `trace: true` on the start payload) — sub-workflows inherit the flag. Set `trace: true` / `LOOPSTACK_TRACE=true` to record every run, e.g. on a development backend.

## Other Environment Variables

These are read directly from the environment and are not part of `LoopstackModule.forRoot()`.

### General

| Env var                      | Default       | Description                                             |
| ---------------------------- | ------------- | ------------------------------------------------------- |
| `NODE_ENV`                   | `development` | Node.js environment                                     |
| `DEFAULT_TRANSITION_TIMEOUT` | `300000`      | Workflow transition timeout in milliseconds (5 minutes) |

### API List Pagination

Page sizes for the list endpoints of the REST API, used when a request omits `limit`.

| Env var                    | Default | Description                                                                     |
| -------------------------- | ------- | ------------------------------------------------------------------------------- |
| `WORKFLOW_DEFAULT_LIMIT`   | `100`   | Default page size of `GET /api/v1/workflows`                                    |
| `WORKSPACE_DEFAULT_LIMIT`  | `100`   | Default page size of `GET /api/v1/workspaces`                                   |
| `DOCUMENT_DEFAULT_LIMIT`   | `100`   | Default page size of `GET /api/v1/documents`                                    |
| `DOCUMENT_MAX_LIMIT`       | `500`   | Largest page `GET /api/v1/documents` serves; a larger `limit` is capped to this |
| `ADMIN_USER_DEFAULT_LIMIT` | `100`   | Default page size of `GET /api/v1/admin/users`                                  |

Only the document list has an upper bound. The workflow, workspace and admin user lists serve whatever `limit` a request asks for.

### Scheduler

| Env var            | Default | Description                                                          |
| ------------------ | ------- | -------------------------------------------------------------------- |
| `TASK_CONCURRENCY` | `10`    | How many scheduler tasks one process runs at once (positive integer) |

A workflow that occupies a task for its whole lifetime — a long-running agent session, for example — holds one of these slots, so leave headroom when running several. The value is exported from `@loopstack/core` as `TASK_CONCURRENCY` for apps that need to plan against it.

`TASK_CONCURRENCY` is read once, when `@loopstack/core` is imported — before `LoopstackModule.forRoot()` loads `.env`. A value in `.env` is therefore ignored. Set it in the process environment instead: in your shell, container or process manager, or with `node --env-file=.env`.

### LLM Providers (examples)

Set these when using the corresponding LLM provider modules.

| Env var             | Module                     | Description            |
| ------------------- | -------------------------- | ---------------------- |
| `ANTHROPIC_API_KEY` | `@loopstack/claude-module` | Anthropic API key      |
| `OPENAI_API_KEY`    | `@loopstack/openai-module` | OpenAI API key         |
| `CLAUDE_MODEL`      | `@loopstack/claude-module` | Default model fallback |
| `OPENAI_MODEL`      | `@loopstack/openai-module` | Default model fallback |

See [LLM Providers](../build/ai/llm-providers.md#environment-variables) for how these combine with module-level and per-call models.

### OAuth Providers (examples)

Set these when using OAuth modules for third-party integrations.

| Env var                     | Module                               | Description                    |
| --------------------------- | ------------------------------------ | ------------------------------ |
| `GITHUB_CLIENT_ID`          | `@loopstack/github-module`           | GitHub OAuth app client ID     |
| `GITHUB_CLIENT_SECRET`      | `@loopstack/github-module`           | GitHub OAuth app client secret |
| `GITHUB_OAUTH_REDIRECT_URI` | `@loopstack/github-module`           | GitHub OAuth redirect URI      |
| `GOOGLE_CLIENT_ID`          | `@loopstack/google-workspace-module` | Google OAuth client ID         |
| `GOOGLE_CLIENT_SECRET`      | `@loopstack/google-workspace-module` | Google OAuth client secret     |
| `GOOGLE_OAUTH_REDIRECT_URI` | `@loopstack/google-workspace-module` | Google OAuth redirect URI      |

### Feature Modules

Set these when using the corresponding feature modules.

| Env var                  | Module                                  | Default                     | Description                                                                                                         |
| ------------------------ | --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `WORKSPACE_BASE_PATH`    | `@loopstack/local-file-explorer-module` | `process.cwd()`             | Root directory the file explorer lists and reads; paths outside it are rejected                                     |
| `CLAUDE_WEB_FETCH_MODEL` | `@loopstack/web-module`                 | `claude-haiku-4-5-20251001` | Model `WebFetchTool` summarizes with when called with a `prompt` and the provider is `claude`; its `model` arg wins |
| `QUOTA_ENABLED`          | `@loopstack/quota`                      | `false`                     | Set to `true` to enable quota tracking                                                                              |
| `QUOTA_REDIS_HOST`       | `@loopstack/quota`                      | value of `REDIS_HOST`       | Redis host for quota counters                                                                                       |
| `QUOTA_REDIS_PORT`       | `@loopstack/quota`                      | value of `REDIS_PORT`       | Redis port for quota counters                                                                                       |
| `QUOTA_REDIS_PASSWORD`   | `@loopstack/quota`                      | value of `REDIS_PASSWORD`   | Redis password for quota counters                                                                                   |

The `QUOTA_*` variables are read only when the module is registered with `QuotaModule.forRootAsync()` — see [`@loopstack/quota`](api/quota.md#quotamodule).

## Docker Compose

The `@loopstack/loopstack-module` package ships with a Docker Compose file that starts PostgreSQL and Redis with settings that match the defaults above — no `.env` file needed for local development. Studio is a separate, optional compose file.

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d          # Postgres + Redis
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.studio.yml up -d   # Studio (optional)
```

To customize, create a `.env` file in your project root:

```dotenv
VITE_API_URL=http://localhost:3000
```

The `VITE_API_URL` variable tells Studio where your backend is running. It defaults to `http://localhost:3000`.
