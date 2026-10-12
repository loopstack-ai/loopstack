import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer';
import { FileSearchExampleWorkflow } from './workflows/file-search/file-search-example.workflow';
import { RemoteClientExampleWorkflow } from './workflows/remote-client/remote-client-example.workflow';

const WORKFLOWS = [RemoteClientExampleWorkflow, FileSearchExampleWorkflow];

@StudioApp({
  title: 'Remote Client Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    RemoteFileExplorerModule.forFeature(),
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),
  ],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class RemoteClientExamplesModule {}
