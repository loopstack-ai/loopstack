import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSubscriberEntity } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';

export interface WorkflowEventPayload {
  correlationId: string;
  eventName: string;
  workspaceId: string;
  data: {
    workflowId: string | undefined;
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
    subscriberRootWorkflowId: string | undefined,
    subscriberWorkflowId: string,
    subscriberTransition: string,
    eventCorrelationId: string,
    eventName: string,
    userId: string,
    workspaceId?: string,
    metadata?: Record<string, unknown>,
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
      subscriberRootWorkflowId,
      subscriberWorkflowId,
      subscriberTransition,
      eventCorrelationId,
      eventName,
      userId,
      workspaceId,
      metadata: metadata ?? null,
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

  async removeSubscribersByRootWorkflowId(rootWorkflowId: string): Promise<void> {
    await this.entityRepository.delete({
      subscriberRootWorkflowId: rootWorkflowId,
    });
  }

  async removeSubscriber(id: string) {
    await this.entityRepository.delete({ id });
  }
}
