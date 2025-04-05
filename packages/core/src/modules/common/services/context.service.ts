import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextInterface,
  ProcessRunInterface,
  ProjectEntity,
} from '@loopstack/shared';

@Injectable()
export class ContextService {
  createRootContext(
    project: ProjectEntity,
    additional: Partial<ContextInterface>,
  ): ContextInterface {
    return {
      model: project.model,
      userId: project.createdBy,
      projectId: project.id,
      workspaceId: project.workspaceId,
      labels: project.labels,
      index: project.index,
      ...additional,
    } as ContextInterface;
  }

  create(payload: ProcessRunInterface | ContextInterface): ContextInterface {
    return _.cloneDeep(payload) as ContextInterface;
  }
}
