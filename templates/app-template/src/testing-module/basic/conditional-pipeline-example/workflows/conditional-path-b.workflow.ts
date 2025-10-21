import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig, Output } from '@loopstack/shared';

@BlockConfig({
  imports: [CreateChatMessage],
  config: {
    title: 'Path B',
  },
  configFile: __dirname + '/simple-message.workflow.yaml',
})
export class ConditionalPathBWorkflow extends Workflow  {
  @Output()
  get message() {
    return 'Path B was chosen';
  }
}