import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSubscriberEntity } from '@loopstack/common';

export interface PipelineEventPayload {
  eventPipelineId: string;
  eventName: string;
  workspaceId: string;
  data: Record<string, unknown> | undefined;
}

@Injectable()
export class EventSubscriberService {
  private readonly logger = new Logger(EventSubscriberService.name);

  constructor(
    @InjectRepository(EventSubscriberEntity)
    private entityRepository: Repository<EventSubscriberEntity>,
  ) {}

  async registerSubscriber(
    subscriberPipelineId: string,
    subscriberWorkflowId: string,
    subscriberTransition: string,
    eventPipelineId: string,
    eventName: string,
    userId: string,
    workspaceId?: string,
  ): Promise<EventSubscriberEntity> {
    const existing = await this.entityRepository.findOne({
      where: {
        subscriberPipelineId,
        subscriberWorkflowId,
        subscriberTransition,
        eventPipelineId,
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
      eventPipelineId,
      eventName,
      userId,
      workspaceId,
    });

    return await this.entityRepository.save(subscriber);
  }

  async findSubscribers(
    eventPipelineId: string,
    eventName: string,
    workspaceId: string,
  ): Promise<EventSubscriberEntity[]> {
    return this.entityRepository.find({
      where: {
        eventPipelineId,
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
