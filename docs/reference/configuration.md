# Configuration

Loopstack is configured via `LoopstackModule.forRoot()` options and environment variables. Environment variables are read from a `.env` file in your project root.

All settings have sensible defaults — a fresh project works out of the box with no configuration.

## `LoopstackModule.forRoot()` Options

```typescript
LoopstackModule.forRoot({
  enableAuth: false,        // default: false (no authentication)
  database: { ... },        // PostgreSQL connection
  redis: { ... },           // Redis connection
  auth: { ... },            // JWT and hub auth settings
  cors: { ... },            // CORS configuration
})
```

### `enableAuth`

Enables authentication. When `false` (the default), a local development user is created automatically and no login is required.

| Option       | Env var          | Default |
| ------------ | ---------------- | ------- |
| `enableAuth` | `LOOPSTACK_AUTH` | `false` |

Set `enableAuth: true` or `LOOPSTACK_AUTH=true` to require authentication via Loopstack Hub.

### `database`

PostgreSQL connection settings. All fields are optional — defaults connect to a local PostgreSQL instance.

| Option                | Env var             | Default     |
| --------------------- | ------------------- | ----------- |
| `database.host`       | `DATABASE_HOST`     | `localhost` |
| `database.port`       | `DATABASE_PORT`     | `5432`      |
| `database.username`   | `DATABASE_USERNAME` | `postgres`  |
| `database.password`   | `DATABASE_PASSWORD` | `admin`     |
| `database.database`   | `DATABASE_NAME`     | `postgres`  |
| `database.connection` | —                   | —           |

Set `database.connection` to reuse an existing TypeORM connection by name. When set, Loopstack skips its own `TypeOrmModule.forRoot()` registration.

### `redis`

Redis connection settings for BullMQ job queues.

| Option           | Env var          | Default     |
| ---------------- | ---------------- | ----------- |
| `redis.host`     | `REDIS_HOST`     | `localhost` |
| `redis.port`     | `REDIS_PORT`     | `6379`      |
| `redis.password` | `REDIS_PASSWORD` | —           |

### `auth`

JWT and hub authentication settings. Only relevant when `enableAuth` is `true`.

| Option                      | Env var                  | Default                                          |
| --------------------------- | ------------------------ | ------------------------------------------------ |
| `auth.jwt.secret`           | `JWT_SECRET`             | `dev-secret-change-me`                           |
| `auth.jwt.expiresIn`        | `JWT_EXPIRES_IN`         | `1h`                                             |
| `auth.jwt.refreshSecret`    | `JWT_REFRESH_SECRET`     | value of `JWT_SECRET`                            |
| `auth.jwt.refreshExpiresIn` | `JWT_REFRESH_EXPIRES_IN` | `7d`                                             |
| `auth.clientId`             | `CLIENT_ID`              | `local`                                          |
| `auth.hub.issuer`           | `HUB_ISSUER`             | `https://hub.loopstack.ai`                       |
| `auth.hub.jwksUri`          | `HUB_JWKS_URI`           | `https://hub.loopstack.ai/.well-known/jwks.json` |

### `cors`

CORS configuration. Defaults to `{ origin: true, credentials: true }`. Set to `false` to disable CORS.

## Other Environment Variables

These are read directly from the environment and are not part of `LoopstackModule.forRoot()`.

### General

| Env var                      | Default       | Description                                             |
| ---------------------------- | ------------- | ------------------------------------------------------- |
| `NODE_ENV`                   | `development` | Node.js environment                                     |
| `DEFAULT_TRANSITION_TIMEOUT` | `300000`      | Workflow transition timeout in milliseconds (5 minutes) |

### LLM Providers (examples)

Set these when using the corresponding LLM provider modules.

| Env var             | Module                     | Description       |
| ------------------- | -------------------------- | ----------------- |
| `ANTHROPIC_API_KEY` | `@loopstack/claude-module` | Anthropic API key |
| `OPENAI_API_KEY`    | `@loopstack/openai-module` | OpenAI API key    |

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

## Docker Compose

The `@loopstack/loopstack-module` package ships with Docker Compose files that start PostgreSQL, Redis, and Studio with settings that match the defaults above — no `.env` file needed for local development.

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

To customize, create a `.env` file in your project root:

```dotenv
VITE_API_URL=http://localhost:3000
```

The `VITE_API_URL` variable tells Studio where your backend is running. It defaults to `http://localhost:3000`.
