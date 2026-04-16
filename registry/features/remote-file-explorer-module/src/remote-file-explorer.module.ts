import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerController } from './controllers';

@Module({
  imports: [LoopCoreModule, RemoteClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [RemoteFileExplorerController],
})
export class RemoteFileExplorerModule {}
