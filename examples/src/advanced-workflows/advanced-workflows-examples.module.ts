import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { AgentErrorHandlingFailingSubWorkflow } from './workflows/agent-error-handling/agent-error-handling-failing-sub.workflow';
import { AgentErrorHandlingWorkflow } from './workflows/agent-error-handling/agent-error-handling.workflow';
import { FailingSubWorkflowTool } from './workflows/agent-error-handling/tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './workflows/agent-error-handling/tools/runtime-error.tool';
import { StrictSchemaTool } from './workflows/agent-error-handling/tools/strict-schema.tool';
import { BatchProcessingExampleWorkflow } from './workflows/batch-processing/batch-processing-example.workflow';
import { CustomToolExampleWorkflow } from './workflows/custom-tool/custom-tool-example.workflow';
import { MathService } from './workflows/custom-tool/services/math.service';
import { CounterTool } from './workflows/custom-tool/tools/counter.tool';
import { MathSumTool } from './workflows/custom-tool/tools/math-sum.tool';
import { DynamicRoutingExampleWorkflow } from './workflows/dynamic-routing/dynamic-routing-example.workflow';
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
  TestUiDocumentsWorkflow,
  AgentErrorHandlingWorkflow,
];

@StudioApp({
  title: 'Advanced Workflows Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    ClaudeModule,
    GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),
    DefaultGreetingModule,
    GermanGreetingModule,
    FrenchGreetingModule,
    NestedGreetingModule,
  ],
  providers: [
    MathService,
    MathSumTool,
    CounterTool,
    StrictSchemaTool,
    RuntimeErrorTool,
    FailingSubWorkflowTool,
    RunSubWorkflowExampleSubWorkflow,
    RunSubWorkflowExampleFailingSubWorkflow,
    AgentErrorHandlingFailingSubWorkflow,
    ...WORKFLOWS,
  ],
  exports: WORKFLOWS,
})
export class AdvancedWorkflowsExamplesModule {}
