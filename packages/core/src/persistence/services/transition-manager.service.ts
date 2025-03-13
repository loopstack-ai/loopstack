import { Injectable } from '@nestjs/common';
import { ActionExecutePayload } from '../../processor';
import { WorkflowEntity } from '../entities';
import { TransitionContextInterface } from '../../processor/interfaces/transition-context.interface';
import { DocumentService } from './document.service';
import { DocumentEntity } from '../entities';
import { TransitionResultInterface } from '../../processor';
import { ContextInterface } from '../../processor/interfaces/context.interface';
const Ajv = require("ajv");

@Injectable()
export class TransitionManagerService {
  constructor(private documentService: DocumentService) {}

  private workflow: WorkflowEntity;
  private workflowContext: ContextInterface;
  private transitionContext: TransitionContextInterface;
  private nextPlace: string | undefined;
  private props: any;

  public setContext(payload: ActionExecutePayload) {
    this.workflow = payload.workflow;
    this.workflowContext = payload.workflowContext;
    this.transitionContext = payload.transitionContext;
    this.nextPlace = undefined;
    this.props = payload.props;

    return this;
  }

  createDocument(data: Partial<DocumentEntity>): DocumentEntity {
    if (data.schema) {
      const ajv = new Ajv();
      const validate = ajv.compile(data.schema);
      const valid = validate(data.contents)
      if (!valid) {
        console.log(validate.errors);
        throw new Error(`Error validating document contents.`)
      }
    }

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

  selectMergeImports(names: string[] | undefined) {
    if (!names?.length) {
      return {};
    }

    return this.workflowContext.imports
      ?.filter((item) => names.includes(item.name))
      .map((item) => ({
        [item.name]: item.curr,
      })).reduce((prev, curr) => ({
        ...prev,
        ...curr,
      }), {}) ?? {};
  }
}
