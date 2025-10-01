import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ExampleWorkspace } from './examples-workspace';
import { SequenceExamplePipeline } from './basic/sequence-example/sequence-example.pipeline';
import { ResearchTopicExampleWorkflow } from './basic/sequence-example/workflows/research-topic-example.workflow';
import { WriteContentExampleWorkflow } from './basic/sequence-example/workflows/write-content-example.workflow';
import { PublishContentExampleWorkflow } from './basic/sequence-example/workflows/publish-content-example.workflow';

@Module({
  imports: [
    LoopCoreModule,
  ],
  providers: [
    ExampleWorkspace,
    SequenceExamplePipeline,
    ResearchTopicExampleWorkflow,
    WriteContentExampleWorkflow,
    PublishContentExampleWorkflow,
  ],
})
export class ExamplesModule {}
