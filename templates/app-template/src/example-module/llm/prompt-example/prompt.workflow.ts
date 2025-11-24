import { Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { z } from 'zod';
import { AiGenerateText } from '@loopstack/llm';
import { Expose } from 'class-transformer';

const propertiesSchema = z.object({
  subject: z.string().default("coffee"),
});

@BlockConfig({
  imports: [
    AiGenerateText
  ],
  properties: propertiesSchema,
  configFile: __dirname + '/prompt.workflow.yaml',
})
export class PromptWorkflow extends Workflow  {
  @Input()
  @Expose()
  llmResponse: any;
}