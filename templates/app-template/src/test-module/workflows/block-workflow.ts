import { Block } from '@loopstack/shared';
import { CreateMock } from '@loopstack/core';

@Block({
  imports: [CreateMock],
  config: {
    type: 'stateMachine',
    title: "Block Workflow",
  },
  configFile: __dirname + '/block-workflow.yaml',
})
export class BlockWorkflow {}