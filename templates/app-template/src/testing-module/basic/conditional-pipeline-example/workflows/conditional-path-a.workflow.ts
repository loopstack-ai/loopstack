import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig, Output } from '@loopstack/shared';

@BlockConfig({
  imports: [CreateChatMessage],
  config: {
    title: 'Path A',
  },
  configFile: __dirname + '/simple-message.workflow.yaml',
})
export class ConditionalPathAWorkflow extends Workflow  {
  @Output()
  get message() {
    return 'Path A was chosen';
  }
}