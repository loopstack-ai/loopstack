import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { ChatWorkflow } from './chat.workflow';

@Module({
  imports: [CoreUiModule, AiModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatExampleModule {}
