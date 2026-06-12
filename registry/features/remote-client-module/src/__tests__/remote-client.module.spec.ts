import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { ENVIRONMENT_CONFIG } from '@loopstack/common';

// TypeOrmModule.forFeature creates real repository providers that explode without a DataSource.
// Stub it so the test can focus on RemoteClientModule's own wiring (RemoteClient, env config).
vi.mock(import('@nestjs/typeorm'), async (importOriginal) => {
  const actual = await importOriginal();
  @Module({})
  class StubTypeOrmModule {}
  return {
    ...actual,
    TypeOrmModule: {
      ...actual.TypeOrmModule,
      forFeature: (): DynamicModule => ({ module: StubTypeOrmModule, providers: [], exports: [] }),
    },
  };
});

const { RemoteClientModule } = await import('../remote-client.module.js');
const { EnvironmentConfigService } = await import('../services/environment-config.service.js');
const { RemoteClient } = await import('../services/remote-client.service.js');

// Cross-package deps (TypeORM repositories, SecretsModule internals, etc.) are out of scope —
// we only care that RemoteClientModule wires its OWN providers correctly.
// useMocker stubs any unresolved injection token with an empty object.
function build(imports: Array<Type<unknown> | DynamicModule>) {
  return Test.createTestingModule({ imports })
    .useMocker(() => ({}))
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
