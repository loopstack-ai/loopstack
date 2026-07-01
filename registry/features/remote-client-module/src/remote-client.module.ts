import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENVIRONMENT_CONFIG, WorkspaceEntity, registerStudioExtension } from '@loopstack/common';
import type { AvailableEnvironmentInterface, EnvironmentConfigInterface } from '@loopstack/contracts/api';
import { SecretsModule } from '@loopstack/secrets-module';
import { EnvironmentController } from './controllers/index.js';
import { WorkspaceEnvironmentEntity } from './entities/index.js';
import { EnvironmentConfigService } from './services/environment-config.service.js';
import { EnvironmentService } from './services/environment.service.js';
import { RemoteClient } from './services/remote-client.service.js';
import {
  BashTool,
  EditTool,
  GlobTool,
  GrepTool,
  LogsTool,
  ReadTool,
  RebuildAppTool,
  ResetWorkspaceTool,
  SyncSecretsTool,
  WriteTool,
} from './tools/index.js';

/**
 * Options for `RemoteClientModule.forRoot` — the list of environment types users can provision via
 * `environments.available`.
 *
 * @public
 */
export interface RemoteClientModuleOptions {
  environments?: {
    available?: AvailableEnvironmentInterface[];
  };
}

/**
 * Options for `RemoteClientModule.forFeature` — the environment `slots` a feature module contributes.
 *
 * @public
 */
export interface RemoteClientFeatureOptions {
  slots: EnvironmentConfigInterface[];
}

const TOOLS = [
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool,
  RebuildAppTool,
  ResetWorkspaceTool,
  LogsTool,
  SyncSecretsTool,
];

const SHARED_IMPORTS = [
  DiscoveryModule,
  SecretsModule,
  TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceEnvironmentEntity]),
];

const ROOT_EXPORTS = [RemoteClient, EnvironmentService, EnvironmentConfigService, ENVIRONMENT_CONFIG, ...TOOLS];

function environmentConfigProvider(available?: AvailableEnvironmentInterface[]): Provider {
  return {
    provide: EnvironmentConfigService,
    useFactory: (discoveryService: DiscoveryService) => new EnvironmentConfigService(discoveryService, available),
    inject: [DiscoveryService],
  };
}

function rootProviders(options?: RemoteClientModuleOptions): Provider[] {
  return [
    RemoteClient,
    EnvironmentService,
    environmentConfigProvider(options?.environments?.available),
    { provide: ENVIRONMENT_CONFIG, useExisting: EnvironmentConfigService },
    ...TOOLS,
  ];
}

/**
 * Internal global root module — provides RemoteClient, environment services, and
 * default tools globally with empty defaults. Separate class from RemoteClientModule
 * so a bare import boots a working container and forRoot() can override config
 * without conflicting with forFeature() imports.
 */
@Global()
@Module({
  imports: SHARED_IMPORTS,
  controllers: [EnvironmentController],
  providers: rootProviders(),
  exports: ROOT_EXPORTS,
})
class RemoteClientRootModule {}

/**
 * Feature host for slot extension providers. Kept separate from
 * `RemoteClientModule` so `forFeature()` does not transitively re-import
 * `RemoteClientRootModule` (which would create a second @Global root with
 * default config that shadows the configured one from `forRoot()`).
 */
@Module({})
class RemoteClientFeatureModule {}

/**
 * NestJS module that provides the `RemoteClient` HTTP client, environment
 * services (`EnvironmentService`, `EnvironmentConfigService`), the
 * `EnvironmentController`, and the remote workflow tools (`ReadTool`, `WriteTool`,
 * `EditTool`, `BashTool`, `GlobTool`, `GrepTool`, `RebuildAppTool`,
 * `ResetWorkspaceTool`, `LogsTool`, `SyncSecretsTool`) for operating on a remote
 * workspace's filesystem and shell.
 *
 * Registration:
 * - `RemoteClientModule` — bare import. Registers the global root with default
 *   (empty) config; enough when you don't need to declare available environment types.
 * - `RemoteClientModule.forRoot(options?: RemoteClientModuleOptions)` — use once at
 *   the app root to set the global config, notably the list of available
 *   environment types (`options.environments.available`) users can provision.
 * - `RemoteClientModule.forFeature(options: RemoteClientFeatureOptions)` — use in a
 *   feature module to register environment slot configurations (`options.slots`)
 *   scoped to that module; does not re-import the global root.
 *
 * Requires: a configured TypeORM database connection — the module registers the
 * `WorkspaceEntity` and `WorkspaceEnvironmentEntity` and co-imports `SecretsModule`.
 * `forFeature` additionally requires a non-empty `slots` array.
 *
 * @public
 */
@Module({ imports: [RemoteClientRootModule] })
export class RemoteClientModule {
  static forRoot(options?: RemoteClientModuleOptions): DynamicModule {
    return {
      module: RemoteClientRootModule,
      global: true,
      imports: SHARED_IMPORTS,
      controllers: [EnvironmentController],
      providers: rootProviders(options),
      exports: ROOT_EXPORTS,
    };
  }

  static forFeature(options: RemoteClientFeatureOptions): DynamicModule {
    return {
      module: RemoteClientFeatureModule,
      providers: options.slots.map((slot) => registerStudioExtension('environments', slot)),
    };
  }
}
