import { type DynamicModule, Module } from '@nestjs/common';
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

@Module({})
export class RemoteClientModule {
  static forRoot(options?: RemoteClientModuleOptions): DynamicModule {
    return {
      global: true,
      module: RemoteClientModule,
      imports: [
        DiscoveryModule,
        SecretsModule,
        TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceEnvironmentEntity]),
      ],
      controllers: [EnvironmentController],
      providers: [
        RemoteClient,
        EnvironmentService,
        {
          provide: EnvironmentConfigService,
          useFactory: (discoveryService: DiscoveryService) =>
            new EnvironmentConfigService(discoveryService, options?.environments?.available),
          inject: [DiscoveryService],
        },
        {
          provide: ENVIRONMENT_CONFIG,
          useExisting: EnvironmentConfigService,
        },
        ...TOOLS,
      ],
      exports: [RemoteClient, EnvironmentService, EnvironmentConfigService, ENVIRONMENT_CONFIG, ...TOOLS],
    };
  }

  static forFeature(options: RemoteClientFeatureOptions): DynamicModule {
    return {
      module: RemoteClientModule,
      providers: options.slots.map((slot) => registerStudioExtension('environments', slot)),
    };
  }
}
