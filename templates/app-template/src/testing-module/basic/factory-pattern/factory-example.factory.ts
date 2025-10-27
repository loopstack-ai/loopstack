import { BlockConfig } from '@loopstack/shared';
import { Factory } from '@loopstack/core';
import { ProcessItemWorkflow } from './workflows/process-item.workflow';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [ProcessItemWorkflow],
  config: {
    title: "Example 2: Pipeline Factory"
  },
  configFile: __dirname + '/factory-example.factory.yaml',
})
export class FactoryExampleFactory extends Factory {
  @Expose()
  get fruits() {
    return [
      'Apples',
      'Oranges',
      'Bananas'
    ]
  }
}