import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { TestUiDocumentsWorkflow } from './test-ui-documents.workflow';

@Module({
  imports: [LoopCoreModule],
  providers: [TestUiDocumentsWorkflow],
  exports: [TestUiDocumentsWorkflow],
})
export class TestUiDocumentsExampleModule {}
