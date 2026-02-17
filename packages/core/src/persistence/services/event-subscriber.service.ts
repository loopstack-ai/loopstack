import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSubscriberEntity } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';

export interface PipelineEventPayload {
  correlationId: string;
  eventName: string;
  workspaceId: string;
  data: {
    pipelineId: string | undefined;
    status: WorkflowState;
    result: Record<string, unknown> | null;
  };
}

@Injectable()
export class EventSubscriberService {
  private readonly logger = new Logger(EventSubscriberService.name);

  constructor(
    @InjectRepository(EventSubscriberEntity)
    private entityRepository: Repository<EventSubscriberEntity>,
  ) {}

  async registerSubscriber(
    subscriberPipelineId: string | undefined,
    subscriberWorkflowId: string,
    subscriberTransition: string,
    eventCorrelationId: string,
    eventName: string,
    userId: string,
    workspaceId?: string,
  ): Promise<EventSubscriberEntity> {
    const existing = await this.entityRepository.findOne({
      where: {
        subscriberWorkflowId,
        subscriberTransition,
        eventCorrelationId,
        eventName,
      },
    });

    if (existing) {
      return existing;
    }

    const subscriber = this.entityRepository.create({
      subscriberPipelineId,
      subscriberWorkflowId,
      subscriberTransition,
      eventCorrelationId,
      eventName,
      userId,
      workspaceId,
    });

    return await this.entityRepository.save(subscriber);
  }

  async findSubscribers(
    eventCorrelationId: string,
    eventName: string,
    workspaceId: string,
  ): Promise<EventSubscriberEntity[]> {
    return this.entityRepository.find({
      where: {
        eventCorrelationId,
        eventName,
        workspaceId,
      },
    });
  }

  async removeSubscribersByPipelineId(pipelineId: string): Promise<void> {
    await this.entityRepository.delete({
      subscriberPipelineId: pipelineId,
    });
  }

  async removeSubscriber(id: string) {
    await this.entityRepository.delete({ id });
  }
}
