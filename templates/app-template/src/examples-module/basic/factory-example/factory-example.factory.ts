import { Block, Output } from '@loopstack/shared';
import { Factory } from '@loopstack/core';
import { ProcessItemWorkflow } from './workflows/process-item.workflow';

@Block({
  imports: [ProcessItemWorkflow],
  config: {
    title: "Example 2: Pipeline Factory"
  },
  configFile: __dirname + '/factory-example.factory.yaml',
})
export class FactoryExampleFactory extends Factory {

  @Output()
  get fruits() {
    return [
      'Apples',
      'Oranges',
      'Bananas'
    ]
  }
}