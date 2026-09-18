import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { TestUiDocumentsWorkflow } from './workflows/ui-documents/ui-documents-example.workflow';

const WORKFLOWS = [TestUiDocumentsWorkflow];

@StudioApp({
  title: 'Documents Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class DocumentsExamplesModule {}
