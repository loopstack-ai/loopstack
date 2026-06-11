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

export interface RemoteClientModuleOptions {
  environments?: {
    available?: AvailableEnvironmentInterface[];
  };
}

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
 * Remote Client Module — wires the RemoteClient and environment tools.
 *
 * - Bare import (`RemoteClientModule`) — registers the global root with default config.
 * - `forRoot(options)` — sets the global config (e.g. available environments).
 * - `forFeature(options)` — registers environment slots for the current module.
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
      module: RemoteClientModule,
      providers: options.slots.map((slot) => registerStudioExtension('environments', slot)),
    };
  }
}
