import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { FileDocument } from './documents/file-document';
import { PromptStructuredOutputWorkflow } from './prompt-structured-output.workflow';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [FileDocument, PromptStructuredOutputWorkflow],
  exports: [PromptStructuredOutputWorkflow],
})
export class PromptStructuredOutputExampleModule {}
