import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  WorkflowEntity,
} from '@loopstack/shared';
import { TaskSchedulerService } from '../services/task-scheduler.service';

const config = z.object({
  name: z.string()
}).strict();

const schema = z.object({
  name: z.string()
}).strict();

@Handler({
  config,
  schema,
})
export class RemoveTaskScheduleHandler implements HandlerInterface {
  private readonly logger = new Logger(RemoveTaskScheduleHandler.name);

  constructor(private taskSchedulerService: TaskSchedulerService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    await this.taskSchedulerService.removeTask(context.workspaceId, context.pipelineId, props.name);

    return {
      success: true,
    };
  }
}
