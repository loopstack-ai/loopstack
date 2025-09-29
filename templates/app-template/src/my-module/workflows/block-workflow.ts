import { Block } from '@loopstack/shared';
import { CreateMock } from '../tools/create-mock-tool';

@Block({
  imports: [CreateMock],
  config: {
    type: 'stateMachine',
    title: "Block Workflow",
  },
  configFile: __dirname + '/block-workflow.yaml',
})
export class BlockWorkflow {}