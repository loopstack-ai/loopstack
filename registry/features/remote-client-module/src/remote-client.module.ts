import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { SecretsModule } from '@loopstack/secrets-module';
import { EnvironmentController } from './controllers/index.js';
import { RemoteClient } from './services/remote-client.service.js';
import { SandboxEnvironmentService } from './services/sandbox-environment.service.js';
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

@Module({
  imports: [SecretsModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [EnvironmentController],
  providers: [
    RemoteClient,
    SandboxEnvironmentService,
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
  ],
  exports: [
    RemoteClient,
    SandboxEnvironmentService,
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
  ],
})
export class RemoteClientModule {}
