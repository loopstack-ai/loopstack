import { Block } from '@loopstack/shared';
import { Workspace } from '@loopstack/core';
import { FactoryExampleFactory } from './basic/factory-example/factory-example.factory';
import { CustomToolExampleWorkflow } from './basic/custom-tool-example/workflows/custom-tool-example.workflow';
import { ContextDataExampleSequence } from './basic/context-data-example/context-data-example.sequence';
import { DynamicRoutingExampleWorkflow } from './basic/dynamic-routing-example/dynamic-routing-example.workflow';
import {
  ConditionalPipelineExampleSequence
} from './basic/conditional-pipeline-example/conditional-pipeline-example.sequence';

@Block({
  imports: [
    ContextDataExampleSequence,
    FactoryExampleFactory,
    CustomToolExampleWorkflow,
    DynamicRoutingExampleWorkflow,
    ConditionalPipelineExampleSequence
  ],
  config: {
    title: 'Example Workspace'
  },
})
export class ExampleWorkspace extends Workspace {}