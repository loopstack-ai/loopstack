import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity, RunContext, WorkflowEntity, WorkflowMetadataInterface } from '@loopstack/common';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(context: RunContext, metadata: WorkflowMetadataInterface, data: Partial<DocumentEntity>): DocumentEntity {
    const transition = metadata.transition!;
    if (!transition.id) {
      throw new Error(`No transition assigned to processor state.`);
    }

    return this.documentRepository.create({
      ...data,
      transition: transition.id,
      index: metadata.documents.length ?? 0,
      workflowIndex: context.index,
      place: transition.to,
      labels: context.labels,
      workflow: { id: context.workflowId } as WorkflowEntity,
      workspaceId: context.workspaceId,
      pipelineId: context.pipelineId,
      createdBy: context.userId,
    });
  }
}
