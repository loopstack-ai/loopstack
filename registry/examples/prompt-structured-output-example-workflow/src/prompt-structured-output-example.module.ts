import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { FileDocument } from './documents/file-document.js';
import { PromptStructuredOutputWorkflow } from './prompt-structured-output.workflow.js';

@Module({
  imports: [ClaudeModule],
  providers: [FileDocument, PromptStructuredOutputWorkflow],
  exports: [PromptStructuredOutputWorkflow],
})
export class PromptStructuredOutputExampleModule {}
