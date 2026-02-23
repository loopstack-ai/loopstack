import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { EventSubscriberService, PipelineEventPayload } from '../../persistence';
import { TaskSchedulerService } from './task-scheduler.service';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventSubscriberService.name);

  constructor(
    private readonly eventSubscriberService: EventSubscriberService,
    private readonly taskSchedulerService: TaskSchedulerService,
  ) {}

  @OnEvent('pipeline.event')
  async handlePipelineEvent(payload: PipelineEventPayload): Promise<void> {
    const { correlationId, eventName, workspaceId, data } = payload;

    const subscribers = await this.eventSubscriberService.findSubscribers(correlationId, eventName, workspaceId);

    for (const subscriber of subscribers) {
      this.logger.log(
        `Matching subscriber found: pipeline=${subscriber.subscriberPipelineId}, ` +
          `workflow=${subscriber.subscriberWorkflowId}, transition=${subscriber.subscriberTransition}`,
      );

      try {
        await this.taskSchedulerService.addTask({
          id: 'event_subscriber_execution-' + randomUUID(),
          workspaceId,
          task: {
            name: 'event_subscriber_execution',
            type: 'run_pipeline',
            pipelineId: subscriber.subscriberPipelineId,
            payload: {
              transition: {
                id: subscriber.subscriberTransition,
                workflowId: subscriber.subscriberWorkflowId,
                payload: data,
              },
            },
            user: subscriber.userId,
          },
        } satisfies ScheduledTask);

        if (subscriber.once) {
          await this.eventSubscriberService.removeSubscriber(subscriber.id);
        }
      } catch (error) {
        this.logger.error(`Failed to add task for subscriber ${subscriber.id}: ${error}`);
      }
    }
  }
}
