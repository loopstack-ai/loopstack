import { Module } from '@nestjs/common';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
import { RemoteFileExplorerExampleWorkflow } from './remote-file-explorer-example.workflow';

@Module({
  imports: [RemoteFileExplorerModule],
  providers: [RemoteFileExplorerExampleWorkflow],
  exports: [RemoteFileExplorerExampleWorkflow],
})
export class RemoteFileExplorerExampleModule {}
