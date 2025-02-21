import { Injectable } from '@nestjs/common';
import { PipelineCollectionService } from '../../configuration/services/pipeline-collection.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { PipelineConfigInterface } from '@loopstack/shared';
import { FunctionCallService } from './function-call.service';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ResultInterface } from '../interfaces/result.interface';
import { ContextService } from './context.service';

@Injectable()
export class PipelineProcessorService {
  constructor(
    private contextService: ContextService,
    private pipelineCollectionService: PipelineCollectionService,
    private functionCallService: FunctionCallService,
    private workflowProcessorService: WorkflowProcessorService,
  ) {}

  hasPipeline(name: string): boolean {
    return this.pipelineCollectionService.has(name);
  }

  getSequence(pipeline: PipelineConfigInterface): string[] {
    if (undefined === pipeline.sequence) {
      const factory = pipeline.factory;
      if (undefined === factory) {
        throw new Error(`pipeline has no sequence or factory defined.`);
      }

      throw 'factory not implemented';
    }

    return _.map(pipeline.sequence, 'name');
  }

  async runSequenceItem(name: string, result: ResultInterface) {
    if (this.hasPipeline(name)) {
      return this.processPipeline(name, result.context);
    }

    if (this.workflowProcessorService.hasWorkflow(name)) {
      return this.workflowProcessorService.processWorkflow(
        name,
        result.context,
      );
    }

    throw new Error(`workflow or pipeline with name "${name}" not found.`);
  }

  async processPipeline(
    name: string,
    parentContext: ContextInterface,
  ): Promise<ResultInterface> {
    console.log('Processing pipeline:', name);

    const pipeline = this.pipelineCollectionService.getByName(name);
    if (!pipeline) {
      throw new Error(`pipeline with name "${name}" not found.`);
    }

    const context = this.contextService.create(parentContext);
    let result: { context: ContextInterface } = { context };

    // before functions update the working context
    result = this.functionCallService.applyFunctions(
      pipeline.prepare,
      result.context,
      result.context,
    );

    for (const itemName of this.getSequence(pipeline)) {
      result = await this.runSequenceItem(itemName, result);
    }

    // pipelines return the parentContext and apply actions to it
    // they do not pass down its working context
    return this.functionCallService.applyFunctions(
      pipeline.export,
      parentContext,
      result.context,
    );
  }
}
