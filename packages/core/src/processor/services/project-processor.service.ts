import { Injectable } from '@nestjs/common';
import { ProjectCollectionService } from '../../configuration/services/project-collection.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { ContextInterface } from '../interfaces/context.interface';
import { NamespacesService } from '../../persistence/services/namespace.service';

@Injectable()
export class ProjectProcessorService {
  constructor(
    private projectCollectionService: ProjectCollectionService,
    private workflowProcessorService: WorkflowProcessorService,
    private namespacesService: NamespacesService,
  ) {}

  async processProject(
    model: string,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    console.log('Processing project:', model);

    const projectConfig = this.projectCollectionService.getByName(model);
    if (!projectConfig) {
      throw new Error(`project model "${model}" not found.`);
    }

    context.namespace = await this.namespacesService.create({
      name: model,
      model: model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      metadata: undefined,
      createdBy: context.userId,
      parent: null,
    });
    context.labels.push(context.namespace.name);

    return this.workflowProcessorService.processChild(
      projectConfig.entrypoint,
      context,
      context,
    );
  }
}
