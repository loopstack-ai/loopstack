import { Injectable } from '@nestjs/common';
import { ActionExecutePayload } from '../interfaces/state-machine-action.interface';
import { DocumentCreateDto } from '../../persistence/dtos/document-create.dto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { DocumentService } from '../../persistence/services/document.service';
import { WorkspaceEntity } from '../../persistence/entities/workspace.entity';
import { ProjectEntity } from '../../persistence/entities/project.entity';
import { DocumentEntity } from '../../persistence/entities/document.entity';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { ContextInterface } from '../../processor/interfaces/context.interface';

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

  createDocument(document: DocumentCreateDto): DocumentEntity {
    const dto = plainToInstance(DocumentCreateDto, document);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      console.log(errors);
      throw new Error(
        `Could not create document ${document.name}. Failed validation.`,
      );
    }

    const entity = this.documentService.create({
      ...dto,
      index: this.workflow.documents?.length ?? 0,
      workflowIndex: this.workflow.index,
      transition: this.transitionContext.transition,
      place: this.workflow.place,
      workspaceId: this.workflowContext.workspaceId,
      projectId: this.workflowContext.projectId,
      workflow: this.workflow,
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
