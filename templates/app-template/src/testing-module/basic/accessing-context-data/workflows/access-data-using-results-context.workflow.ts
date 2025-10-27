import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Access Data Using Result Context',
  },
  configFile: __dirname + '/access-data-using-results-context.workflow.yaml',
})
export class AccessDataUsingResultsContextWorkflow extends Workflow  {

  // Helper method to access data from a specific transition and tool call id
  // Marked as Output to make accessible in template expressions
  @Expose()
  get theMessage() {
    return 'Data access using custom helper: '
       + this.state.transitionResults?.create_some_data.toolResults?.say_hello.data;
  }
}