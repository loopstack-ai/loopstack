import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { BatchProcessingExampleWorkflow } from './workflows/batch-processing/batch-processing-example.workflow';
import { CustomToolExampleWorkflow } from './workflows/custom-tool/custom-tool-example.workflow';
import { MathService } from './workflows/custom-tool/services/math.service';
import { CounterTool } from './workflows/custom-tool/tools/counter.tool';
import { MathSumTool } from './workflows/custom-tool/tools/math-sum.tool';
import { DynamicRoutingExampleWorkflow } from './workflows/dynamic-routing/dynamic-routing-example.workflow';
import { RunSubWorkflowExampleFanOutWorkflow } from './workflows/fan-out/fan-out-example.workflow';
import { DefaultGreetingModule } from './workflows/module-config/consumers/default-greeting.module';
import { DefaultGreetingWorkflow } from './workflows/module-config/consumers/default-greeting.workflow';
import { FrenchGreetingModule } from './workflows/module-config/consumers/french-greeting.module';
import { FrenchGreetingWorkflow } from './workflows/module-config/consumers/french-greeting.workflow';
import { NestedGreetingModule } from './workflows/module-config/consumers/nested-greeting.module';
import { NestedGreetingWorkflow } from './workflows/module-config/consumers/nested-greeting.workflow';
import { GreeterModule } from './workflows/module-config/greeter/greeter.module';
import { RunSubWorkflowExampleSequenceWorkflow } from './workflows/sequence/sequence-example.workflow';
import { ServerToolExampleWorkflow } from './workflows/server-tool/server-tool-example.workflow';
import { CodeExecutionTool } from './workflows/server-tool/tools/code-execution.tool';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from './workflows/sub-workflow/sub-workflow-error-handling.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from './workflows/sub-workflow/sub-workflow-failing-sub.workflow';
import { RunSubWorkflowExampleParentWorkflow } from './workflows/sub-workflow/sub-workflow-parent.workflow';
import { RunSubWorkflowExampleShowModesWorkflow } from './workflows/sub-workflow/sub-workflow-show-modes.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './workflows/sub-workflow/sub-workflow-sub.workflow';
import { TestUiDocumentsWorkflow } from './workflows/ui-documents/ui-documents-example.workflow';
import { WorkflowResultWorkflow } from './workflows/workflow-state/workflow-result-example.workflow';
import { WorkflowStateWorkflow } from './workflows/workflow-state/workflow-state-example.workflow';

const WORKFLOWS = [
  WorkflowStateWorkflow,
  WorkflowResultWorkflow,
  DynamicRoutingExampleWorkflow,
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleErrorHandlingWorkflow,
  RunSubWorkflowExampleShowModesWorkflow,
  RunSubWorkflowExampleFanOutWorkflow,
  RunSubWorkflowExampleSequenceWorkflow,
  BatchProcessingExampleWorkflow,
  CustomToolExampleWorkflow,
  ServerToolExampleWorkflow,
  TestUiDocumentsWorkflow,
];

@StudioApp({
  title: 'Advanced Workflows Examples',
  // The greeting workflows are provided by their consumer modules, each with its own GreeterTool config,
  // so they are listed here but not in providers.
  workflows: [...WORKFLOWS, DefaultGreetingWorkflow, FrenchGreetingWorkflow, NestedGreetingWorkflow],
})
@Module({
  imports: [
    ClaudeModule,
    GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),
    DefaultGreetingModule,
    FrenchGreetingModule,
    NestedGreetingModule,
  ],
  providers: [
    MathService,
    MathSumTool,
    CounterTool,
    CodeExecutionTool,
    RunSubWorkflowExampleSubWorkflow,
    RunSubWorkflowExampleFailingSubWorkflow,
    ...WORKFLOWS,
  ],
  exports: WORKFLOWS,
})
export class AdvancedWorkflowsExamplesModule {}
