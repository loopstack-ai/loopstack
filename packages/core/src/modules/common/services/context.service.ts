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
      ...additional,
    } as ContextInterface;
  }

  create(payload: ProcessRunInterface | ContextInterface): ContextInterface {
    return _.cloneDeep(payload) as ContextInterface;
  }
}
