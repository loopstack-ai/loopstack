import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { BatchProcessingExampleWorkflow } from './workflows/batch-processing/batch-processing-example.workflow';
import { DynamicRoutingExampleWorkflow } from './workflows/dynamic-routing/dynamic-routing-example.workflow';

const WORKFLOWS = [DynamicRoutingExampleWorkflow, BatchProcessingExampleWorkflow];

@StudioApp({
  title: 'Transitions Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class TransitionsExamplesModule {}
