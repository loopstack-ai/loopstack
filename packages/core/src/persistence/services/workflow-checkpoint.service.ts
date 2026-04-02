import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowCheckpointEntity } from '@loopstack/common';

export interface CreateCheckpointData {
  workflowId: string;
  place: string;
  transitionId: string | null;
  transitionFrom: string | null;
  state: Record<string, unknown>;
  tools: Record<string, unknown>;
  documentIds: string[];
  invalidatedDocumentIds: string[];
  version: number;
}

@Injectable()
export class WorkflowCheckpointService {
  constructor(
    @InjectRepository(WorkflowCheckpointEntity)
    private readonly checkpointRepository: Repository<WorkflowCheckpointEntity>,
  ) {}

  async createCheckpoint(data: CreateCheckpointData): Promise<WorkflowCheckpointEntity> {
    const checkpoint = this.checkpointRepository.create(data);
    return this.checkpointRepository.save(checkpoint);
  }

  async getLatest(workflowId: string): Promise<WorkflowCheckpointEntity | null> {
    return this.checkpointRepository.findOne({
      where: { workflowId },
      order: { version: 'DESC' },
    });
  }

  async getHistory(
    workflowId: string,
  ): Promise<
    Pick<WorkflowCheckpointEntity, 'id' | 'place' | 'transitionId' | 'transitionFrom' | 'version' | 'createdAt'>[]
  > {
    return this.checkpointRepository.find({
      where: { workflowId },
      order: { version: 'ASC' },
      select: ['id', 'place', 'transitionId', 'transitionFrom', 'version', 'createdAt'],
    });
  }

  async getCheckpointById(id: string): Promise<WorkflowCheckpointEntity | null> {
    return this.checkpointRepository.findOne({
      where: { id },
    });
  }

  async deleteByWorkflowId(workflowId: string): Promise<void> {
    await this.checkpointRepository.delete({ workflowId });
  }
}
