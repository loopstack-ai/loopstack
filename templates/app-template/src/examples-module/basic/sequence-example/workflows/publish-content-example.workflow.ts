import { CreateChatMessage, CreateMock } from '@loopstack/core';
import { Block } from '@loopstack/shared';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    type: 'stateMachine',
    title: 'Publish Content',
  },
  configFile: __dirname + '/publish-content-example.workflow.yaml',
})
export class PublishContentExampleWorkflow {}