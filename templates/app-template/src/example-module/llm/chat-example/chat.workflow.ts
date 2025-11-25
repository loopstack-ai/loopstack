import { Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/common';
import { AiGenerateText } from '@loopstack/llm';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [
    AiGenerateText
  ],
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow extends Workflow  {
  @Input()
  @Expose()
  llmResponse: any;
}