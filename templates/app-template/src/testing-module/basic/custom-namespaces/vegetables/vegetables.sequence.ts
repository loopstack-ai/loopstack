import { BlockConfig } from '@loopstack/shared';
import { Pipeline } from '@loopstack/core';
import { HelloFromNamespaceMessageWorkflow } from '../workflows/hello-from-namespace-message.workflow';

@BlockConfig({
  imports: [
    HelloFromNamespaceMessageWorkflow,
  ],
  configFile: __dirname + '/vegetables.sequence.yaml',
})
export class VegetablesSequence extends Pipeline {}