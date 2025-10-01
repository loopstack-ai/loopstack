import { CreateChatMessage, CreateMock } from '@loopstack/core';
import { Block } from '@loopstack/shared';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    type: 'stateMachine',
    title: 'Write Content',
  },
  configFile: __dirname + '/write-content-example.workflow.yaml',
})
export class WriteContentExampleWorkflow {}