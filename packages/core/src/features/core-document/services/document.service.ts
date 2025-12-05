import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity, WorkflowEntity } from '@loopstack/common';
import { Tool } from '../../../workflow-processor';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(block: Tool, data: Partial<DocumentEntity>): DocumentEntity {
    if (!block.ctx.workflow.id) {
      throw new Error(`No workflow assigned to processor context.`);
    }
    if (!block.ctx.workflow.transition?.id) {
      throw new Error(`No transition assigned to processor state.`);
    }

    // todo. this check could be done earlier or introduce a specific transition for alternative paths
    if (Array.isArray(block.ctx.workflow.transition.to)) {
      throw new Error(
        `Cannot create a document on an undecided transition target. Make sure to set a singular "to" place for a transition where documents are created`,
      );
    }

    return this.documentRepository.create({
      ...data,
      transition: block.ctx.workflow.transition.id,
      index: block.ctx.workflow.documents?.length ?? 0,
      workflowIndex: block.ctx.index,
      place: block.ctx.workflow.transition.to,
      labels: block.ctx.labels,
      workflow: { id: block.ctx.workflow.id } as WorkflowEntity,
      workspaceId: block.ctx.workspaceId,
      pipelineId: block.ctx.pipelineId,
      createdBy: block.ctx.userId,
    });
  }
}
