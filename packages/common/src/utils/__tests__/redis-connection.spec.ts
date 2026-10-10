import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveRedisConnection } from '../redis-connection.js';

const REDIS_VARS = ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB'] as const;

describe('resolveRedisConnection', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(REDIS_VARS.map((key) => [key, process.env[key]]));
    REDIS_VARS.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    REDIS_VARS.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  });

  it('defaults to localhost on database 0', () => {
    expect(resolveRedisConnection()).toEqual({ host: 'localhost', port: 6379, password: undefined, db: 0 });
  });

  it('reads the discrete vars', () => {
    process.env.REDIS_HOST = 'cache';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';
    process.env.REDIS_DB = '3';

    expect(resolveRedisConnection()).toEqual({ host: 'cache', port: 6380, password: 'secret', db: 3 });
  });

  it('takes the database from the REDIS_URL path', () => {
    process.env.REDIS_URL = 'redis://:pw@cache:6380/2';

    expect(resolveRedisConnection()).toEqual({ host: 'cache', port: 6380, password: 'pw', db: 2 });
  });

  it('falls back to REDIS_DB when the URL carries no path', () => {
    process.env.REDIS_URL = 'redis://cache:6380';
    process.env.REDIS_DB = '4';

    expect(resolveRedisConnection()).toMatchObject({ host: 'cache', db: 4 });
  });

  it('prefers REDIS_URL over the discrete vars', () => {
    process.env.REDIS_URL = 'redis://from-url:6381/1';
    process.env.REDIS_HOST = 'from-host';
    process.env.REDIS_PORT = '6382';
    process.env.REDIS_DB = '9';

    expect(resolveRedisConnection()).toMatchObject({ host: 'from-url', port: 6381, db: 1 });
  });

  it('prefers explicit options over everything', () => {
    process.env.REDIS_URL = 'redis://from-url:6381/1';
    process.env.REDIS_DB = '9';

    expect(resolveRedisConnection({ host: 'given', port: 1234, password: 'given-pw', db: 7 })).toEqual({
      host: 'given',
      port: 1234,
      password: 'given-pw',
      db: 7,
    });
  });

  it('keeps database 0 explicit rather than falling through to the environment', () => {
    process.env.REDIS_DB = '5';

    expect(resolveRedisConnection({ db: 0 })).toMatchObject({ db: 0 });
  });

  it('ignores values that are not usable numbers', () => {
    process.env.REDIS_PORT = 'not-a-port';
    process.env.REDIS_DB = '-1';

    expect(resolveRedisConnection()).toMatchObject({ port: 6379, db: 0 });
  });
});
