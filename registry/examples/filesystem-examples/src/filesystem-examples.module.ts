import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { LocalFileExplorerModule } from '@loopstack/local-file-explorer-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { LocalFileExplorerExampleWorkflow } from './workflows/local-file-explorer/local-file-explorer-example.workflow';
import { RemoteClientExampleWorkflow } from './workflows/remote-client/remote-client-example.workflow';
import { RemoteFileExplorerExampleWorkflow } from './workflows/remote-file-explorer/remote-file-explorer-example.workflow';
import { SandboxExampleWorkflow } from './workflows/sandbox/sandbox-example.workflow';

const WORKFLOWS = [
  SandboxExampleWorkflow,
  RemoteFileExplorerExampleWorkflow,
  RemoteClientExampleWorkflow,
  LocalFileExplorerExampleWorkflow,
];

@StudioApp({
  title: 'Filesystem Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    SandboxFilesystemModule,
    SandboxToolModule,
    RemoteFileExplorerModule.forFeature(),
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),
    LocalFileExplorerModule.forFeature(),
  ],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class FilesystemExamplesModule {}
