import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [CreateChatMessage],
  config: {
    title: 'Message',
  },
  configFile: __dirname + '/simple-message.workflow.yaml',
})
export class HelloFromNamespaceMessageWorkflow extends Workflow  {
  @Expose()
  get message() {
    return `Hello from namespace ${ this.ctx.namespace.name }`;
  }
}