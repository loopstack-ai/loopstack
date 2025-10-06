import { Block } from '@loopstack/shared';
import { CreateDocument, CreateMock, MessageDocument, StateMachine } from '@loopstack/core';

@Block({
  imports: [CreateMock, CreateDocument, MessageDocument],
  config: {
    type: 'stateMachine',
    title: "Block Workflow",
  },
  configFile: __dirname + '/block-workflow.yaml',
})
export class BlockWorkflow extends StateMachine {

  #otherTest = 'testOther';
  #myData = 'test';
  public researchResult: string;
  public helloWorldProp = 'test123';

  public helloWorld(ctx: any): string {
    return 'test: ' + ctx.researchResult;
  }

  private get getMyData(): string {
    return this.#myData;
  }

  public createContext(ctx: any) {
    return {
      helloWorld: ctx.helloWorld
    }
  }
}