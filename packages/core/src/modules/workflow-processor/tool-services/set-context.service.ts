import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Service,
  ServiceInterface,
  ServiceCallResult,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { WorkflowContextService } from '../services';

const config = z
  .object({
    key: z.string(),
    value: z.any(),
  })
  .strict();

const schema = z
  .object({
    key: z.string(),
    value: z.any(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class SetContextService implements ServiceInterface {
  private readonly logger = new Logger(SetContextService.name);

  constructor(private readonly workflowContextService: WorkflowContextService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    workflow = this.workflowContextService.setWorkflowContextUpdate(workflow, props.key, props.value);

    this.logger.debug(`Set context update key "${props.key}".`);

    return {
      success: true,
      workflow,
    };
  }
}
