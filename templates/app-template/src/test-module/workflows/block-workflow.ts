import { Block } from '@loopstack/shared';
import { CreateDocument, CreateMock, MessageDocument } from '@loopstack/core';

@Block({
  imports: [CreateMock, CreateDocument, MessageDocument],
  config: {
    type: 'stateMachine',
    title: "Block Workflow",
  },
  configFile: __dirname + '/block-workflow.yaml',
})
export class BlockWorkflow {}