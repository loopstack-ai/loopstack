import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { LocalFileExplorerModule } from '@loopstack/local-file-explorer';
import { LocalFileExplorerExampleWorkflow } from './workflows/local-file-explorer/local-file-explorer-example.workflow';

const WORKFLOWS = [LocalFileExplorerExampleWorkflow];

@StudioApp({
  title: 'Local File Explorer Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [LocalFileExplorerModule.forFeature()],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class LocalFileExplorerExamplesModule {}
