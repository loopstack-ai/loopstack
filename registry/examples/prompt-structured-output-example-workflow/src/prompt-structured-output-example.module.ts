import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { PromptStructuredOutputWorkflow } from './prompt-structured-output.workflow';
import { FileDocument } from './documents/file-document';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [
    FileDocument,
    PromptStructuredOutputWorkflow,
  ],
  exports: [
    PromptStructuredOutputWorkflow,
  ]
})
export class PromptStructuredOutputExampleModule {}
