import { Injectable } from '@nestjs/common';
import { WorkflowCollectionService } from '../../configuration/services/workflow-collection.service';
import { WorkflowConfigInterface } from '@loopstack/shared';
import { FunctionCallService } from './function-call.service';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ResultInterface } from '../interfaces/result.interface';
import { ContextService } from './context.service';

@Injectable()
export class WorkflowProcessorService {
  constructor(
    private contextService: ContextService,
    private workflowCollectionService: WorkflowCollectionService,
    private functionCallService: FunctionCallService,
  ) {}

  hasWorkflow(name: string): boolean {
    return this.workflowCollectionService.has(name);
  }

  async runWorkflow (
      workflow: WorkflowConfigInterface,
      context: ContextInterface,
  ) {
    let result: { context: ContextInterface } = { context };

    if (workflow.sequence) {
      const sequence = _.map(workflow.sequence, 'name');
      for (const itemName of sequence) {
        result = await this.processWorkflow(itemName, context);
      }
      return result;
    }

    throw new Error('workflow needs to implement a sequence or a factory or a stateMachine');
  }

  async processWorkflow(
    name: string,
    parentContext: ContextInterface,
  ): Promise<ResultInterface> {
    if (!this.hasWorkflow(name)) {
      throw new Error(`workflow with name "${name}" not found.`);
    }

    console.log('Processing pipeline:', name);

    const workflow = this.workflowCollectionService.getByName(name);
    if (!workflow) {
      throw new Error(`pipeline with name "${name}" not found.`);
    }

    const context = this.contextService.create(parentContext);
    let result: { context: ContextInterface } = { context };

    // before functions update the working context
    result = this.functionCallService.applyFunctions(
        workflow.prepare,
      result.context,
      result.context,
    );

    result = await this.runWorkflow(workflow, result.context)

    // pipelines return the parentContext and apply actions to it
    // they do not pass down its working context
    return this.functionCallService.applyFunctions(
        workflow.export,
      parentContext,
      result.context,
    );
  }
}
