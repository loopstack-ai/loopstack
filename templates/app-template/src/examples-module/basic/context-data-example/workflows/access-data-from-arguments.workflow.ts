import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { Block } from '@loopstack/shared';
import { z } from 'zod';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Example: Access Data Via Arguments',
  },

  // define arguments
  properties: z.object({
    message: z.string(),
  }),

  configFile: __dirname + '/access-data-from-arguments.workflow.yaml',
})
export class AccessDataFromArgumentsWorkflow extends Workflow  {}