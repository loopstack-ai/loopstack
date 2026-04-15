import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { SecretsModule } from '@loopstack/secrets-module';
import { EnvironmentController } from './controllers';
import { RemoteAgentClient } from './services/remote-agent-client.service';
import { SandboxEnvironmentService } from './services/sandbox-environment.service';
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
} from './tools';

@Module({
  imports: [LoopCoreModule, SecretsModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [EnvironmentController],
  providers: [
    RemoteAgentClient,
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
    RemoteAgentClient,
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
export class RemoteAgentClientModule {}
