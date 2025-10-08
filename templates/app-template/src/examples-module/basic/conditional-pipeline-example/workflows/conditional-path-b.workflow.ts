import { CreateChatMessage, Workflow } from '@loopstack/core';
import { Block, Output } from '@loopstack/shared';

@Block({
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