import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
import { RemoteClientExampleWorkflow } from './workflows/remote-client/remote-client-example.workflow';
import { RemoteFileExplorerExampleWorkflow } from './workflows/remote-file-explorer/remote-file-explorer-example.workflow';

const WORKFLOWS = [RemoteClientExampleWorkflow, RemoteFileExplorerExampleWorkflow];

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
