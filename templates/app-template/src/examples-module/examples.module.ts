import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { ExampleWorkspace } from './examples-workspace';
import { FactoryExampleFactory } from './basic/factory-example/factory-example.factory';
import { ProcessItemWorkflow } from './basic/factory-example/workflows/process-item.workflow';
import { MathSumTool } from './basic/custom-tool-example/tools/math-sum.tool';
import { CustomToolExampleWorkflow } from './basic/custom-tool-example/workflows/custom-tool-example.workflow';
import { ContextDataExampleSequence } from './basic/context-data-example/context-data-example.sequence';
import {
  AccessDataFromArgumentsWorkflow
} from './basic/context-data-example/workflows/access-data-from-arguments.workflow';
import {
  AccessDataUsingCustomVariableWorkflow
} from './basic/context-data-example/workflows/access-data-using-custom-variable.workflow';
import {
  AccessDataUsingResultsContextWorkflow
} from './basic/context-data-example/workflows/access-data-using-results-context.workflow';
import { DynamicRoutingExampleWorkflow } from './basic/dynamic-routing-example/dynamic-routing-example.workflow';
import {
  ConditionalPipelineExampleSequence
} from './basic/conditional-pipeline-example/conditional-pipeline-example.sequence';
import { ConditionalPathAWorkflow } from './basic/conditional-pipeline-example/workflows/conditional-path-a.workflow';
import { ConditionalPathBWorkflow } from './basic/conditional-pipeline-example/workflows/conditional-path-b.workflow';
import { AlwaysExecutedWorkflow } from './basic/conditional-pipeline-example/workflows/always-executed.workflow';

@Module({
  imports: [
    LoopCoreModule,
  ],
  providers: [
    ExampleWorkspace,

    ContextDataExampleSequence,
    AccessDataFromArgumentsWorkflow,
    AccessDataUsingCustomVariableWorkflow,
    AccessDataUsingResultsContextWorkflow,

    FactoryExampleFactory,
    ProcessItemWorkflow,

    CustomToolExampleWorkflow,
    MathSumTool,

    DynamicRoutingExampleWorkflow,

    ConditionalPipelineExampleSequence,
    AlwaysExecutedWorkflow,
    ConditionalPathAWorkflow,
    ConditionalPathBWorkflow,
  ],
})
export class ExamplesModule {}
