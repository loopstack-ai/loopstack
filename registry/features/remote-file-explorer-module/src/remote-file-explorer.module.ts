import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from '@loopstack/common';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerController } from './controllers';

@Module({
  imports: [RemoteClientModule, TypeOrmModule.forFeature([WorkspaceEntity])],
  controllers: [RemoteFileExplorerController],
})
export class RemoteFileExplorerModule {}
