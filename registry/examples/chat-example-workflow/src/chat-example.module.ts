import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { ChatWorkflow } from './chat.workflow';

@Module({
  imports: [ClaudeModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatExampleModule {}
