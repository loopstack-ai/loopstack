import { Injectable } from '@nestjs/common';
import { ProjectCollectionService } from '../../configuration/services/project-collection.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { ContextInterface } from '../interfaces/context.interface';
import { ProcessStateInterface } from '../interfaces/process-state.interface';

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

    const project = this.projectCollectionService.getByName(name);
    if (!project) {
      throw new Error(`project with name "${name}" not found.`);
    }

    return this.workflowProcessorService.processChild(
      project.entrypoint,
      context,
    );
  }
}
