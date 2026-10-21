import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { KeepRevisionExampleWorkflow } from './workflows/keep-revision/keep-revision-example.workflow';
import { ToolDocumentsExampleWorkflow } from './workflows/tool-documents/tool-documents-example.workflow';
import { ReceiptTool } from './workflows/tool-documents/tools/receipt.tool';
import { TestUiDocumentsWorkflow } from './workflows/ui-documents/ui-documents-example.workflow';

const WORKFLOWS = [TestUiDocumentsWorkflow, ToolDocumentsExampleWorkflow, KeepRevisionExampleWorkflow];

@StudioApp({
  title: 'Documents Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [ReceiptTool, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class DocumentsExamplesModule {}
