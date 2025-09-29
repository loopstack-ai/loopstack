import { Block } from '@loopstack/shared';
import { BlockPipeline } from '../pipelines/block-pipeline';

@Block({
  imports: [BlockPipeline],
  config: {
    type: 'workspace',
    title: 'My Block Workspace'
  },
})
export class BlockWorkspace {}