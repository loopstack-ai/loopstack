import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
import { RemoteFileExplorerExampleWorkflow } from './remote-file-explorer-example.workflow';

@Module({
  imports: [LoopCoreModule, RemoteClientModule, RemoteFileExplorerModule],
  providers: [RemoteFileExplorerExampleWorkflow],
  exports: [RemoteFileExplorerExampleWorkflow],
})
export class RemoteFileExplorerExampleModule {}
