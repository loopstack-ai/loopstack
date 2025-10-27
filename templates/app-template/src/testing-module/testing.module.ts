import { Module } from '@nestjs/common';
import { CoreToolsModule, LoopCoreModule } from '@loopstack/core';
import { FactoryExampleFactory } from './basic/factory-pattern/factory-example.factory';
import { ProcessItemWorkflow } from './basic/factory-pattern/workflows/process-item.workflow';
import { MathSumTool } from './basic/custom-tools/tools/math-sum.tool';
import { CustomToolExampleWorkflow } from './basic/custom-tools/workflows/custom-tool-example.workflow';
import { ContextDataExampleSequence } from './basic/accessing-context-data/context-data-example.sequence';
import {
  AccessDataFromArgumentsWorkflow
} from './basic/accessing-context-data/workflows/access-data-from-arguments.workflow';
import {
  AccessDataUsingCustomVariableWorkflow
} from './basic/accessing-context-data/workflows/access-data-using-custom-variable.workflow';
import {
  AccessDataUsingResultsContextWorkflow
} from './basic/accessing-context-data/workflows/access-data-using-results-context.workflow';
import { DynamicRoutingExampleWorkflow } from './basic/dynamic-routing/dynamic-routing-example.workflow';
import {
  ConditionalPipelineExampleSequence
} from './basic/conditional-pipeline/conditional-pipeline-example.sequence';
import { ConditionalPathAWorkflow } from './basic/conditional-pipeline/workflows/conditional-path-a.workflow';
import { ConditionalPathBWorkflow } from './basic/conditional-pipeline/workflows/conditional-path-b.workflow';
import { AlwaysExecutedWorkflow } from './basic/conditional-pipeline/workflows/always-executed.workflow';
import { MathService } from './basic/custom-tools/services/math.service';
import { ModuleFactory } from '@loopstack/shared';
import { StatelessCounterTool } from './basic/custom-tools/tools/stateless-counter.tool';
import { StatefulCounterTool } from './basic/custom-tools/tools/stateful-counter.tool';
import { TestModuleFactory } from './test-module-factory.service';
import { TestWorkspace } from './test-workspace';
import {
  HelloFromNamespaceMessageWorkflow
} from './basic/custom-namespaces/workflows/hello-from-namespace-message.workflow';
import { CustomNamespacesSequence } from './basic/custom-namespaces/custom-namespaces.sequence';
import { VegetablesSequence } from './basic/custom-namespaces/vegetables/vegetables.sequence';
import { FruitsSequence } from './basic/custom-namespaces/fruits/fruits.sequence';

@Module({
  imports: [
    LoopCoreModule,
    CoreToolsModule,
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

    CustomNamespacesSequence,
    HelloFromNamespaceMessageWorkflow,
    VegetablesSequence,
    FruitsSequence,

    TestModuleFactory,
  ],
  exports: [
    TestModuleFactory
  ]
})
@ModuleFactory(TestModuleFactory)
export class TestingModule {}

