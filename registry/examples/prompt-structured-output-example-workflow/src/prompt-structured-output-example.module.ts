import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { FileDocument } from './documents/file-document';
import { PromptStructuredOutputWorkflow } from './prompt-structured-output.workflow';

@Module({
  imports: [LoopCoreModule, AiModule],
  providers: [FileDocument, PromptStructuredOutputWorkflow],
  exports: [PromptStructuredOutputWorkflow],
})
export class PromptStructuredOutputExampleModule {}
