import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity, WorkflowEntity } from '@loopstack/common';
import { WorkflowExecution } from '../../workflow-processor';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
  ) {}

  create(ctx: WorkflowExecution, data: Partial<DocumentEntity>): DocumentEntity {
    const transition = ctx.runtime.transition!;
    if (!transition.id) {
      throw new Error(`No transition assigned to processor state.`);
    }

    // todo. this check could be done earlier or introduce a specific transition for alternative paths
    if (Array.isArray(transition.to)) {
      throw new Error(
        `Cannot create a document on an undecided transition target. Make sure to set a singular "to" place for a transition where documents are created`,
      );
    }

    return this.documentRepository.create({
      ...data,
      transition: transition.id,
      index: ctx.state.getMetadata('documents')?.length ?? 0,
      workflowIndex: ctx.context.index,
      place: transition.to,
      labels: ctx.context.labels,
      workflow: { id: ctx.context.workflowId } as WorkflowEntity,
      workspaceId: ctx.context.workspaceId,
      pipelineId: ctx.context.pipelineId,
      createdBy: ctx.context.userId,
    });
  }
}
