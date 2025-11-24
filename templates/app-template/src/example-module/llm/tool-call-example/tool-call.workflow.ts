import { CreateChatMessage, SwitchTarget, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { AiGenerateText, DelegateToolCall } from '@loopstack/llm';
import { GetWeather } from './tools/get-weather.tool';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [
    GetWeather,
    AiGenerateText,
    DelegateToolCall,
    CreateChatMessage,
    SwitchTarget,
  ],
  configFile: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow extends Workflow  {

  @Input()
  @Expose()
  llmResponse: any;

  @Input()
  @Expose()
  toolCallResult: any;
}