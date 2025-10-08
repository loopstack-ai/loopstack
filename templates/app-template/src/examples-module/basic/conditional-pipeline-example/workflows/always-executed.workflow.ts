import { CreateChatMessage, Workflow } from '@loopstack/core';
import { Block, Output } from '@loopstack/shared';
import { z } from 'zod';

@Block({
  imports: [CreateChatMessage],
  config: {
    title: 'Initial',
  },
  properties: z.object({
    inputPath: z.string(),
  }),
  configFile: __dirname + '/simple-message.workflow.yaml',
})
export class AlwaysExecutedWorkflow extends Workflow  {
  @Output()
  get message() {
    return `The desired path is "${ this.args.inputPath }"`;
  }
}