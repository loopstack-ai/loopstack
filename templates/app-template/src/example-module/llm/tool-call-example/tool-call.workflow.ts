import { CreateChatMessage, SwitchTarget, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { z } from 'zod';
import { AiGenerateText } from '@loopstack/llm';
import { DelegateToolCalls } from '@loopstack/llm/dist/llm-tools/delegate-tool-calls.tool';
import { GetWeather } from './tools/get-weather.tool';
import { Expose } from 'class-transformer';

const propertiesSchema = z.object({
  subject: z.string().default("coffee"),
});

@BlockConfig({
  imports: [
    GetWeather,
    AiGenerateText,
    DelegateToolCalls,
    CreateChatMessage,
    SwitchTarget,
  ],
  properties: propertiesSchema,
  config: {
    title: 'Example 5: LLM Tool Calling',
  },
  configFile: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow extends Workflow  {
  @Input()
  @Expose()
  toolCallResultMessages: any;
}