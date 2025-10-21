import { Injectable } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
export class WorkflowContextService {
  setWorkflowContextUpdate(
    workflow: WorkflowEntity,
    key: string,
    value: any,
  ): WorkflowEntity {
    // if (!workflow.contextVariables) {
    //   workflow.contextVariables = {};
    // }
    //
    // workflow.contextVariables[key] = value;
    return workflow;
  }
}
