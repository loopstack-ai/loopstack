import { BlockConfig } from '@loopstack/shared';
import { Pipeline } from '@loopstack/core';
import { VegetablesSequence } from './vegetables/vegetables.sequence';
import { FruitsSequence } from './fruits/fruits.sequence';

@BlockConfig({
  imports: [
    VegetablesSequence,
    FruitsSequence,
  ],
  config: {
    title: "Example 6: Custom Namespaces"
  },
  configFile: __dirname + '/custom-namespaces.sequence.yaml',
})
export class CustomNamespacesSequence extends Pipeline {}