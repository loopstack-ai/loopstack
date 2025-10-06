import { Block } from '@loopstack/shared';
import { ResearchTopicExampleWorkflow } from './workflows/research-topic-example.workflow';
import { WriteContentExampleWorkflow } from './workflows/write-content-example.workflow';
import { PublishContentExampleWorkflow } from './workflows/publish-content-example.workflow';
import { Pipeline } from '@loopstack/core';

@Block({
  imports: [
    ResearchTopicExampleWorkflow,
    WriteContentExampleWorkflow,
    PublishContentExampleWorkflow,
  ],
  config: {
    type: 'sequence',
    title: "Example 1: Pipeline Sequence"
  },
  configFile: __dirname + '/sequence-example.pipeline.yaml',
})
export class SequenceExamplePipeline extends Pipeline {
  researchResult: any;
  createdContent: any;
}