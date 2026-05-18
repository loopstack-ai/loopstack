import { Module } from '@nestjs/common';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
import { RemoteFileExplorerExampleWorkflow } from './remote-file-explorer-example.workflow.js';

@Module({
  imports: [RemoteClientModule, RemoteFileExplorerModule],
  providers: [RemoteFileExplorerExampleWorkflow],
  exports: [RemoteFileExplorerExampleWorkflow],
})
export class RemoteFileExplorerExampleModule {}
