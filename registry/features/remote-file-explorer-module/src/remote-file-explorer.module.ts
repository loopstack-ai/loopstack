import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteAgentClientModule } from '@loopstack/remote-agent-client';
import { RemoteFileExplorerController } from './controllers';

@Module({
  imports: [LoopCoreModule, RemoteAgentClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [RemoteFileExplorerController],
})
export class RemoteFileExplorerModule {}
