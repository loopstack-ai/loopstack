import { Injectable } from '@nestjs/common';
import { ProjectCollectionService } from '../../configuration/services/project-collection.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { ContextInterface } from '../interfaces/context.interface';

@Injectable()
export class ProjectProcessorService {
  constructor(
    private projectCollectionService: ProjectCollectionService,
    private workflowProcessorService: WorkflowProcessorService,
  ) {}

  async processProject(
    name: string,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    console.log('Processing project:', name);

    const projectConfig = this.projectCollectionService.getByName(name);
    if (!projectConfig) {
      throw new Error(`project with name "${name}" not found.`);
    }

    return this.workflowProcessorService.processChild(
      projectConfig.entrypoint,
      context,
      context,
    );
  }
}
