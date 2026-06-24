import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { BatchProcessingExampleWorkflow } from './workflows/batch-processing/batch-processing-example.workflow';
import { CustomToolExampleWorkflow } from './workflows/custom-tool/custom-tool-example.workflow';
import { MathService } from './workflows/custom-tool/services/math.service';
import { CounterTool } from './workflows/custom-tool/tools/counter.tool';
import { MathSumTool } from './workflows/custom-tool/tools/math-sum.tool';
import { DynamicRoutingExampleWorkflow } from './workflows/dynamic-routing/dynamic-routing-example.workflow';
import { ErrorRetryWorkflow } from './workflows/error-retry/error-retry-example.workflow';
import { SlowTool } from './workflows/error-retry/tools/slow.tool';
import { Step1Tool } from './workflows/error-retry/tools/step1.tool';
import { Step2Tool } from './workflows/error-retry/tools/step2.tool';
import { RunSubWorkflowExampleFanOutWorkflow } from './workflows/fan-out/fan-out-example.workflow';
import { DefaultGreetingModule } from './workflows/module-config/consumers/default-greeting.module';
import { FrenchGreetingModule } from './workflows/module-config/consumers/french-greeting.module';
import { GermanGreetingModule } from './workflows/module-config/consumers/german-greeting.module';
import { NestedGreetingModule } from './workflows/module-config/consumers/nested-greeting.module';
import { GreeterModule } from './workflows/module-config/greeter/greeter.module';
import { RunSubWorkflowExampleSequenceWorkflow } from './workflows/sequence/sequence-example.workflow';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from './workflows/sub-workflow/sub-workflow-error-handling.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from './workflows/sub-workflow/sub-workflow-failing-sub.workflow';
import { RunSubWorkflowExampleParentWorkflow } from './workflows/sub-workflow/sub-workflow-parent.workflow';
import { RunSubWorkflowExampleShowModesWorkflow } from './workflows/sub-workflow/sub-workflow-show-modes.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './workflows/sub-workflow/sub-workflow-sub.workflow';
import { TestUiDocumentsWorkflow } from './workflows/ui-documents/ui-documents-example.workflow';
import { WorkflowToolResultsWorkflow } from './workflows/workflow-state/tool-results-example.workflow';
import { WorkflowStateWorkflow } from './workflows/workflow-state/workflow-state-example.workflow';

const WORKFLOWS = [
  WorkflowStateWorkflow,
  WorkflowToolResultsWorkflow,
  DynamicRoutingExampleWorkflow,
  ErrorRetryWorkflow,
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
  RunSubWorkflowExampleFailingSubWorkflow,
  RunSubWorkflowExampleErrorHandlingWorkflow,
  RunSubWorkflowExampleShowModesWorkflow,
  RunSubWorkflowExampleFanOutWorkflow,
  RunSubWorkflowExampleSequenceWorkflow,
  BatchProcessingExampleWorkflow,
  CustomToolExampleWorkflow,
  TestUiDocumentsWorkflow,
];

@StudioApp({
  title: 'Advanced Workflows Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),
    DefaultGreetingModule,
    GermanGreetingModule,
    FrenchGreetingModule,
    NestedGreetingModule,
  ],
  providers: [MathService, MathSumTool, CounterTool, Step1Tool, Step2Tool, SlowTool, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class AdvancedWorkflowsExamplesModule {}
