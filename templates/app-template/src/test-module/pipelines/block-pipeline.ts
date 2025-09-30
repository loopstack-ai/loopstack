import { Block } from '@loopstack/shared';
import { BlockWorkflow } from '../workflows/block-workflow';

@Block({
  imports: [BlockWorkflow],
  config: {
    type: 'sequence',
    title: "Block Pipeline Sequence",
  },
  configFile: __dirname + '/block-pipeline.yaml'
})
export class BlockPipeline {}