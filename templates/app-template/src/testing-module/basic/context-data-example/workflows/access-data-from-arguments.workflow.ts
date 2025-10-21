import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';

@BlockConfig({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Access Data Via Arguments',
  },

  // define arguments
  properties: z.object({
    message: z.string(),
  }),

  configFile: __dirname + '/access-data-from-arguments.workflow.yaml',
})
export class AccessDataFromArgumentsWorkflow extends Workflow  {}