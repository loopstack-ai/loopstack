import { Module } from '@nestjs/common';
import { TestUiDocumentsWorkflow } from './test-ui-documents.workflow';

@Module({
  imports: [],
  providers: [TestUiDocumentsWorkflow],
  exports: [TestUiDocumentsWorkflow],
})
export class TestUiDocumentsExampleModule {}
