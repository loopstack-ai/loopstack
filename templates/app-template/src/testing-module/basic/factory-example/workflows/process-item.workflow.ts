import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';
import { Expose } from 'class-transformer';
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
@BlockConfig({
  imports: [CreateChatMessage],
  config: {
    title: 'Processing Item',
  },
  properties: z.object({
    label: z.string(),
    index: z.number(),
    item: z.string(),
  }),
  configFile: __dirname + '/process-item.workflow.yaml',
})
export class ProcessItemWorkflow extends Workflow  {

  // property to store random string
  randomString: string;

  // simple method to generate random string
  generateRandomString(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  // Create and expose a unique id. Using transient scope for the class, the id should be unique for each iteration
  @Expose()
  get uniqueId() {
    if (!this.randomString) {
      this.randomString = this.generateRandomString();
    }

    return this.randomString;
  }

  // Expose the iteration index starting at 1
  @Expose()
  get index() {
    return this.args.index + 1;
  }

}