import type { RedisMemoryServer } from 'redis-memory-server';

export default async function globalTeardown(): Promise<void> {
  const redisServer = (globalThis as any)
    .__REDIS_MEMORY_SERVER__ as RedisMemoryServer;
  if (redisServer) {
    await redisServer.stop();
  }
}
