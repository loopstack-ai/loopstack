import { Block } from '@loopstack/shared';
import { SequenceExamplePipeline } from './basic/sequence-example/sequence-example.pipeline';
import { Workspace } from '@loopstack/core';

@Block({
  imports: [SequenceExamplePipeline],
  config: {
    type: 'workspace',
    title: 'Example Workspace'
  },
})
export class ExampleWorkspace extends Workspace {}