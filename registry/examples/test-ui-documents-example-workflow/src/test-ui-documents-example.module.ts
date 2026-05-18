import { Module } from '@nestjs/common';
import { TestUiDocumentsWorkflow } from './test-ui-documents.workflow.js';

@Module({
  imports: [],
  providers: [TestUiDocumentsWorkflow],
  exports: [TestUiDocumentsWorkflow],
})
export class TestUiDocumentsExampleModule {}
