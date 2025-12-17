import { RedisMemoryServer } from 'redis-memory-server';
import { IMemoryDb, newDb } from 'pg-mem';

export default async function globalSetup(): Promise<void> {
  const redisServer = new RedisMemoryServer({
    instance: {
      port: 6379,
    },
  });

  const host = await redisServer.getHost();
  const port = await redisServer.getPort();

  (globalThis as any).__REDIS_MEMORY_SERVER__ = redisServer;

  process.env.REDIS_HOST = host;
  process.env.REDIS_PORT = String(port);
}

/**
 * Creates a pre-configured pg-mem database with all necessary PostgreSQL
 * functions and extensions registered.
 */
export function createConfiguredPgMem(): IMemoryDb {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });

  db.public.registerFunction({
    implementation: () => 'PostgreSQL 14.0 (pg-mem)',
    name: 'version',
  });

  db.registerExtension('ltree', (schema) => {
  });

  return db;
}
