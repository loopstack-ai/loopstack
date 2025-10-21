import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig, Output } from '@loopstack/shared';
import { z } from 'zod';

@BlockConfig({
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
    return `The desired path is "${ 
      // this.args.inputPath
      0
    }"`;

  }
}