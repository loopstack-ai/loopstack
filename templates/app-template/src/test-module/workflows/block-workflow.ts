import { Block } from '@loopstack/shared';
import { CreateDocument, CreateMock, MessageDocument, Workflow } from '@loopstack/core';

@Block({
  imports: [CreateMock, CreateDocument, MessageDocument],
  config: {
    title: "Block Workflow",
  },
  configFile: __dirname + '/block-workflow.yaml',
})
export class BlockWorkflow extends Workflow {

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