import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [CreateChatMessage],
  config: {
    title: 'Path B',
  },
  configFile: __dirname + '/simple-message.workflow.yaml',
})
export class ConditionalPathBWorkflow extends Workflow  {
  @Expose()
  get message() {
    return 'This is a path B message';
  }
}