import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { WorkflowToolResultsWorkflow } from './workflows/tool-results/tool-results-example.workflow';
import { WorkflowStateWorkflow } from './workflows/workflow-state/workflow-state-example.workflow';

const WORKFLOWS = [WorkflowStateWorkflow, WorkflowToolResultsWorkflow];

@StudioApp({
  title: 'State Management Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class StateManagementExamplesModule {}
