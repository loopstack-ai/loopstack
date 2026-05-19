import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { PromptWorkflow } from './prompt.workflow';

@Module({
  imports: [ClaudeModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptExampleModule {}
