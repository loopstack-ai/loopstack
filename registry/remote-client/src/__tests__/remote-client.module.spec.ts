import type { DynamicModule, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { ENVIRONMENT_CONFIG } from '@loopstack/common';
import { RemoteClientModule } from '../remote-client.module.js';
import { EnvironmentConfigService } from '../services/environment-config.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

// `TypeOrmModule.forFeature` builds its repository providers from the DataSource, so the `{}` the
// mocker hands out for every other token is not enough. Same stub shape as @loopstack/testing's
// MockInfraModule: empty `entityMetadatas` plus a non-mongo `options.type` is all the repository
// factory reads before it returns `getRepository`'s result.
const mockDataSource = {
  entityMetadatas: [] as unknown[],
  options: { type: 'postgres' },
  getRepository: () => ({}),
};

// Cross-package deps (TypeORM repositories, SecretsModule internals, etc.) are out of scope —
// we only care that RemoteClientModule wires its OWN providers correctly.
// useMocker stubs every other unresolved injection token with an empty object.
function build(imports: Array<Type<unknown> | DynamicModule>) {
  return Test.createTestingModule({ imports })
    .useMocker((token) => (token === DataSource ? mockDataSource : {}))
    .compile();
}

describe('RemoteClientModule import forms', () => {
  it('bare import registers RemoteClient and applies the default empty available list globally', async () => {
    const moduleRef = await build([RemoteClientModule]);

    expect(moduleRef.get(RemoteClient, { strict: false })).toBeInstanceOf(RemoteClient);
    const config = moduleRef.get(ENVIRONMENT_CONFIG, { strict: false }) as EnvironmentConfigService;
    expect(config).toBeInstanceOf(EnvironmentConfigService);
    expect(config.available).toEqual([]);

    await moduleRef.close();
  });

  it('forRoot() registers RemoteClient and applies an empty available list globally', async () => {
    const moduleRef = await build([RemoteClientModule.forRoot()]);

    expect(moduleRef.get(RemoteClient, { strict: false })).toBeInstanceOf(RemoteClient);
    const config = moduleRef.get(ENVIRONMENT_CONFIG, { strict: false }) as EnvironmentConfigService;
    expect(config.available).toEqual([]);

    await moduleRef.close();
  });

  it('forRoot(options) makes the configured available environments visible everywhere', async () => {
    const available = [{ type: 'docker', name: 'Docker', connectionUrl: 'http://localhost:3001' }];
    const moduleRef = await build([RemoteClientModule.forRoot({ environments: { available } })]);

    const config = moduleRef.get(ENVIRONMENT_CONFIG, { strict: false }) as EnvironmentConfigService;
    expect(config.available).toEqual(available);

    await moduleRef.close();
  });

  it('bare import alongside forRoot(options) — forRoot wins (bare import is a no-op overlap)', async () => {
    // Edge case: a user could write both bare and forRoot(options) in the same imports list
    // (e.g. via a refactor). We don't endorse this combination, but verify it doesn't silently
    // shadow the explicit forRoot config with the bare import's default.
    const available = [{ type: 'docker', name: 'Docker', connectionUrl: 'http://localhost:3001' }];
    const moduleRef = await build([RemoteClientModule, RemoteClientModule.forRoot({ environments: { available } })]);

    const config = moduleRef.get(ENVIRONMENT_CONFIG, { strict: false }) as EnvironmentConfigService;
    expect(config.available).toEqual(available);

    await moduleRef.close();
  });
});
