import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
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
import { MathService } from './basic/custom-tool-example/services/math.service';
import { ModuleFactory } from '@loopstack/shared';
import { StatelessCounterTool } from './basic/custom-tool-example/tools/stateless-counter.tool';
import { StatefulCounterTool } from './basic/custom-tool-example/tools/stateful-counter.tool';
import { TestModuleFactory } from './test-module-factory.service';
import { TestWorkspace } from './test-workspace';

@Module({
  imports: [
    LoopCoreModule,
    // LlmModule,
  ],
  providers: [
    TestWorkspace,

    ContextDataExampleSequence,
    AccessDataFromArgumentsWorkflow,
    AccessDataUsingCustomVariableWorkflow,
    AccessDataUsingResultsContextWorkflow,

    FactoryExampleFactory,
    ProcessItemWorkflow,

    CustomToolExampleWorkflow,
    MathSumTool,
    MathService,
    StatelessCounterTool,
    StatefulCounterTool,

    DynamicRoutingExampleWorkflow,

    ConditionalPipelineExampleSequence,
    AlwaysExecutedWorkflow,
    ConditionalPathAWorkflow,
    ConditionalPathBWorkflow,

    TestModuleFactory,
  ],
  exports: [
    TestModuleFactory
  ]
})
@ModuleFactory(TestModuleFactory)
export class TestingModule {}

