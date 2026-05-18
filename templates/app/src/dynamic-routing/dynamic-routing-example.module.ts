import { Module } from '@nestjs/common';
import { DynamicRoutingExampleWorkflow } from './dynamic-routing-example.workflow.js';

@Module({
  providers: [DynamicRoutingExampleWorkflow],
  exports: [DynamicRoutingExampleWorkflow],
})
export class DynamicRoutingExampleModule {}
