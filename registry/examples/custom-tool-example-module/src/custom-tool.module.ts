import { Module } from '@nestjs/common';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { MathService } from './services/math.service';
import { MathSumTool } from './tools';
import { CounterTool } from './tools';
import { CustomToolExampleWorkflow } from './workflows';

@Module({
  imports: [CreateChatMessageToolModule],
  providers: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
  exports: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
})
export class CustomToolModule {}
