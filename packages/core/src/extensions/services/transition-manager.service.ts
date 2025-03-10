import { Injectable } from '@nestjs/common';
import { ActionExecutePayload } from '../../processor/interfaces/state-machine-action.interface';
import { DocumentCreateDto } from '../../persistence/dtos';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WorkflowEntity } from '../../persistence/entities';
import { TransitionContextInterface } from '../../processor/interfaces/transition-context.interface';
import { DocumentService } from '../../persistence/services/document.service';
import { DocumentEntity } from '../../persistence/entities';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { DocumentSchema, DocumentType } from '@loopstack/shared';

@Injectable()
export class TransitionManagerService {
  constructor(private documentService: DocumentService) {}

  private workflow: WorkflowEntity;
  private workflowContext: ContextInterface;
  private transitionContext: TransitionContextInterface;
  private nextPlace: string | undefined;

  public setContext(payload: ActionExecutePayload) {
    this.workflow = payload.workflow;
    this.workflowContext = payload.workflowContext;
    this.transitionContext = payload.transitionContext;
    this.nextPlace = undefined;

    return this;
  }

  createDocument(data: any): DocumentEntity {
    // todo validate by schema
    // const document = DocumentSchema.parse(data);
    const entity = this.documentService.create({
      ...data,
      index: this.workflow.documents?.length ?? 0,
      workflowIndex: this.workflow.index,
      transition: this.transitionContext.transition,
      place: this.workflow.place,
      workspaceId: this.workflowContext.workspaceId,
      projectId: this.workflowContext.projectId,
      workflow: this.workflow,
      labels: this.workflow.labels,
    });

    // invalidate previous versions of the same document
    for (const doc of this.workflow.documents) {
      if (doc.name === entity.name && doc.type === entity.type) {
        doc.isInvalidated = true;
      }
    }

    this.workflow.documents.push(entity);
    return entity;
  }

  setWorkflowData(obj: Partial<WorkflowEntity>) {
    Object.assign(this.workflow, obj);
  }

  getResult(): TransitionResultInterface {
    return {
      workflow: this.workflow,
      nextPlace: this.nextPlace,
    };
  }
}
