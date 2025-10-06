import { CreateChatMessage, CreateMock, StateMachine } from '@loopstack/core';
import { Block } from '@loopstack/shared';
import { z } from 'zod';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    type: 'stateMachine',
    title: 'Write Content',
  },
  configFile: __dirname + '/write-content-example.workflow.yaml',
  inputSchema: z.object({
    researchResult: z.string(),
  })
})
export class WriteContentExampleWorkflow extends StateMachine {
  createdContent: any;
}