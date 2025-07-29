import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextInterface,
  ProcessRunInterface,
  PipelineEntity,
} from '@loopstack/shared';

@Injectable()
export class ContextService {
  createRootContext(
    pipeline: PipelineEntity,
    additional: Partial<ContextInterface>,
  ): ContextInterface {
    return {
      model: pipeline.model,
      userId: pipeline.createdBy,
      pipelineId: pipeline.id,
      workspaceId: pipeline.workspaceId,
      labels: pipeline.labels,
      index: pipeline.index,
      includes: new Map(),
      ...additional,
    } as ContextInterface;
  }

  create(payload: ProcessRunInterface | ContextInterface): ContextInterface {
    return _.cloneDeep(payload) as ContextInterface;
  }

  addIncludes(context: ContextInterface, includes: Map<string, string>) {
    context.includes = Array.from(new Map([...context.includes, ...includes]).entries());
  }
}
