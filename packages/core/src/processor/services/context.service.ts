import { Injectable } from '@nestjs/common';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ProcessRunInterface } from '../interfaces/process-run.interface';
import {ProjectEntity} from "../../persistence/entities";

@Injectable()
export class ContextService {

  createRootContext(project: ProjectEntity, additional: Partial<ContextInterface>): ContextInterface {
    return {
      model: project.model,
      userId: project.createdBy,
      projectId: project.id,
      workspaceId: project.workspaceId,
      labels: project.labels,
      ...additional,
    } as ContextInterface
  }

  create(payload: ProcessRunInterface | ContextInterface): ContextInterface {
    return _.cloneDeep(payload) as ContextInterface;
  }
}
