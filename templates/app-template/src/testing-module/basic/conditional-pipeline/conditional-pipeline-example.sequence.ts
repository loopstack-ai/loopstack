import { BlockConfig } from '@loopstack/shared';
import { Pipeline } from '@loopstack/core';
import { ConditionalPathAWorkflow } from './workflows/conditional-path-a.workflow';
import { z } from 'zod';
import { ConditionalPathBWorkflow } from './workflows/conditional-path-b.workflow';
import { AlwaysExecutedWorkflow } from './workflows/always-executed.workflow';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [
    AlwaysExecutedWorkflow,
    ConditionalPathAWorkflow,
    ConditionalPathBWorkflow,
  ],
  config: {
    title: "Example 5: Conditional Pipeline Sequence"
  },
  properties: z.object({
    inputPath: z.string().default('B'), // set default to B, so we don't need to pass in real args for the test
  }),
  configFile: __dirname + '/conditional-pipeline-example.sequence.yaml',
})
export class ConditionalPipelineExampleSequence extends Pipeline {

  @Expose()
  get isPathB() {
    return this.args.inputPath === 'B';
  }

}