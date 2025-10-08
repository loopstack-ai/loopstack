import { CreateChatMessage, CreateMock, SwitchTarget, Workflow } from '@loopstack/core';
import { Block, Input, Output } from '@loopstack/shared';

@Block({
  imports: [SwitchTarget, CreateMock, CreateChatMessage],
  config: {
    title: 'Example 4: Dynamic Routing',
  },
  configFile: __dirname + '/dynamic-routing-example.workflow.yaml',
})
export class DynamicRoutingExampleWorkflow extends Workflow  {
  @Input()
  @Output()
  myValue: number;

  @Output()
  get routeGt200() {
    return this.myValue > 200 ? 'placeC' : 'placeD';
  }
}