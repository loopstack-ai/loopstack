import { Injectable } from '@nestjs/common';
import { ActionExecutePayload } from '../../processor';
import { WorkflowEntity } from '../../persistence/entities';
import { TransitionContextInterface } from '../../processor/interfaces/transition-context.interface';
import { TransitionResultInterface } from '../../processor';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';
import Ajv from 'ajv';

@Injectable()
export class ActionHelperService {
  private workflow: WorkflowEntity;
  private workflowContext: ContextInterface;
  private transitionContext: TransitionContextInterface;
  private nextPlace: string | undefined;
  private documents: DocumentCreateInterface[];
  private props: any;

  public setContext(payload: ActionExecutePayload) {
    this.workflow = payload.workflow!;
    this.workflowContext = payload.context;
    this.transitionContext = payload.transitionContext;
    this.nextPlace = undefined;
    this.documents = [];
    this.props = payload.props;

    return this;
  }

  addDocument(data: DocumentCreateInterface): void {
    if (data.schema) {
      const ajv = new Ajv({
        strict: false,
        keywords: ['ui'],
      });
      const validate = ajv.compile(data.schema);
      const valid = validate(data.contents)
      if (!valid) {
        console.log(validate.errors);
        throw new Error(`Error validating document contents.`)
      }
    }

    this.documents.push({
      ...data,
      transition: this.transitionContext.transition,
    });
  }

  setWorkflowData(obj: Partial<WorkflowEntity>) {
    Object.assign(this.workflow, obj);
  }

  getResult(): TransitionResultInterface {
    return {
      workflow: this.workflow,
      nextPlace: this.nextPlace,
      documents: this.documents
    };
  }

  mergeInputs(names: string[] | undefined, imports: ({ name: string; } & any)[] | undefined): Record<string, any> {
    if (!names?.length) {
      return {};
    }

    return imports
      ?.filter((item) => names.includes(item.name))
      .map((item) => ({
        [item.name]: item.curr,
      })).reduce((prev, curr) => ({
        ...prev,
        ...curr,
      }), {}) ?? {};
  }
}
