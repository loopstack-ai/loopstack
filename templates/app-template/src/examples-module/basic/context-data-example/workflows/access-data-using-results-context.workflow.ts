import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { Block, Output } from '@loopstack/shared';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Example: Access Data Using Result Context',
  },
  configFile: __dirname + '/access-data-using-results-context.workflow.yaml',
})
export class AccessDataUsingResultsContextWorkflow extends Workflow  {

  // Helper method to access data from a specific transition and tool call id
  // Marked as Output to make accessible in template expressions
  @Output()
  get theMessage() {
    return 'Data access using custom helper: ' +
      this.transitionResults?.['create_some_data']?.toolResults?.['say_hello']?.result.data;
  }
}