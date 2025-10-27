import { CreateChatMessage, CreateMock, SwitchTarget, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [SwitchTarget, CreateMock, CreateChatMessage],
  config: {
    title: 'Example 4: Dynamic Routing',
  },
  configFile: __dirname + '/dynamic-routing-example.workflow.yaml',
})
export class DynamicRoutingExampleWorkflow extends Workflow  {
  @Input()
  @Expose()
  myValue: number;

  @Expose()
  get routeGt200() {
    return this.myValue > 200 ? 'placeC' : 'placeD';
  }
}