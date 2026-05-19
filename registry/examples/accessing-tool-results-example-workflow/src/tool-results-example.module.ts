import { Module } from '@nestjs/common';
import { WorkflowToolResultsWorkflow } from './workflow-tool-results.workflow';

@Module({
  providers: [WorkflowToolResultsWorkflow],
  exports: [WorkflowToolResultsWorkflow],
})
export class ToolResultsExampleModule {}
