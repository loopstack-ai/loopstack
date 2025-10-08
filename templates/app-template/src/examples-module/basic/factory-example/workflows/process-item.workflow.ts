import { CreateChatMessage, Workflow } from '@loopstack/core';
import { Block, Output } from '@loopstack/shared';
import { z } from 'zod';

@Block({
  imports: [CreateChatMessage],
  config: {
    title: 'Processing Item',
  },
  properties: z.object({
    label: z.string(),
    index: z.number(),
  }),
  configFile: __dirname + '/process-item.workflow.yaml',
})
export class ProcessItemWorkflow extends Workflow  {

  @Output()
  get getIndex() {
    return this.args.index + 1;
  }
}