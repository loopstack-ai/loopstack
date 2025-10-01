import { Block } from '@loopstack/shared';
import { SequenceExamplePipeline } from './basic/sequence-example/sequence-example.pipeline';

@Block({
  imports: [SequenceExamplePipeline],
  config: {
    type: 'workspace',
    title: 'Example Workspace'
  },
})
export class ExampleWorkspace {}