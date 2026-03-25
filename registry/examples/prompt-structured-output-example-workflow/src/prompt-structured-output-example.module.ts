import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { FileDocument } from './documents/file-document';
import { PromptStructuredOutputWorkflow } from './prompt-structured-output.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [FileDocument, PromptStructuredOutputWorkflow],
  exports: [PromptStructuredOutputWorkflow],
})
export class PromptStructuredOutputExampleModule {}
