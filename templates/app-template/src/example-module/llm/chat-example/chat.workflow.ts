import { Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';
import { AiGenerateText } from '@loopstack/llm';

const propertiesSchema = z.object({
  subject: z.string().default("coffee"),
});

@BlockConfig({
  imports: [
    AiGenerateText
  ],
  properties: propertiesSchema,
  config: {
    title: 'Example 2: LLM Chat',
  },
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow extends Workflow  {}