import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';
import { Expose } from 'class-transformer';

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
  @Expose()
  get message() {
    return `The desired path is "${ this.args.inputPath }"`;
  }
}