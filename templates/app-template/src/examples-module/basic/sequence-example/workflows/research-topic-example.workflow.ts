import { CreateChatMessage, CreateMock } from '@loopstack/core';
import { Block } from '@loopstack/shared';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    type: 'stateMachine',
    title: 'Research',
  },
  configFile: __dirname + '/research-topic-example.workflow.yaml',
})
export class ResearchTopicExampleWorkflow {}