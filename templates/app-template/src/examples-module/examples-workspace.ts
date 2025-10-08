import { Block } from '@loopstack/shared';
import { Workspace } from '@loopstack/core';
import { FactoryExampleFactory } from './basic/factory-example/factory-example.factory';
import { CustomToolExampleWorkflow } from './basic/custom-tool-example/workflows/custom-tool-example.workflow';
import { ContextDataExampleSequence } from './basic/context-data-example/context-data-example.sequence';

@Block({
  imports: [
    ContextDataExampleSequence,
    FactoryExampleFactory,
    CustomToolExampleWorkflow,
  ],
  config: {
    title: 'Example Workspace'
  },
})
export class ExampleWorkspace extends Workspace {}