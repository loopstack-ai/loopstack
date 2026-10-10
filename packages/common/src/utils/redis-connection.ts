/**
 * Redis connection settings a Loopstack deployment uses.
 *
 * @public
 */
export interface RedisConnectionOptions {
  host?: string;
  port?: number;
  password?: string;
  /**
   * Redis database index. Every deployment needs its own: a deployment's workers consume any job on
   * the shared `task-queue`, and a job whose workflow it cannot resolve is a job it cannot run.
   * Replicas of one deployment share a database — that is what makes them one worker pool.
   */
  db?: number;
}

/**
 * The settings after defaults are applied, ready to hand to ioredis or BullMQ.
 *
 * @public
 */
export interface ResolvedRedisConnection {
  host: string;
  port: number;
  password?: string;
  db: number;
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const port = Number.parseInt(value, 10);
  return Number.isNaN(port) ? undefined : port;
}

function parseDb(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const db = Number.parseInt(value, 10);
  return Number.isNaN(db) || db < 0 ? undefined : db;
}

/**
 * Resolves the Redis connection every Redis-backed feature shares — the task queue, the OAuth token
 * and session stores, and the quota counters.
 *
 * Precedence: explicit options, then a single `REDIS_URL` (managed and hosted environments), then the
 * discrete `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` vars, then the defaults
 * `localhost:6379` on database `0`. A `REDIS_URL` path sets the database, so
 * `redis://localhost:6379/2` resolves to database `2`.
 *
 * @public
 */
export function resolveRedisConnection(options?: RedisConnectionOptions): ResolvedRedisConnection {
  const url = process.env.REDIS_URL ? new URL(process.env.REDIS_URL) : undefined;
  // "/2" → 2; a bare "/" or no path leaves the database unset so the next source decides.
  const urlDb = url ? parseDb(url.pathname.replace(/^\//, '')) : undefined;

  return {
    host: options?.host ?? url?.hostname ?? process.env.REDIS_HOST ?? 'localhost',
    port: options?.port ?? parsePort(url?.port) ?? parsePort(process.env.REDIS_PORT) ?? 6379,
    password: options?.password ?? (url?.password || undefined) ?? process.env.REDIS_PASSWORD,
    db: options?.db ?? urlDb ?? parseDb(process.env.REDIS_DB) ?? 0,
  };
}
