import { Injectable } from '@nestjs/common';
import { WorkflowProcessorService } from './workflow-processor.service';
import { ContextInterface } from '../interfaces/context.interface';
import { NamespacesService } from '../../persistence/services/namespace.service';
import {ProjectService} from "../../persistence/services/project.service";
import {ContextService} from "./context.service";
import {ProcessRunInterface} from "../interfaces/process-run.interface";
import { LoopConfigService } from '../../configuration';
import { ProjectType } from '../../configuration/schemas/project.schema';

@Injectable()
export class ProjectProcessorService {
  constructor(
    private loopConfigService: LoopConfigService,
    private projectService: ProjectService,
    private workflowProcessorService: WorkflowProcessorService,
    private namespacesService: NamespacesService,
    private contextService: ContextService,
  ) {}

  async processProject(
    payload: ProcessRunInterface
  ): Promise<ContextInterface> {
    console.log('Processing project:', payload.projectId);
    const project = await this.projectService.getProject(payload.projectId, payload.userId);
    if (!project) {
      throw new Error(`project "${payload.projectId}" not found.`);
    }

    const projectConfig = this.loopConfigService.get<ProjectType>('projects', project.model);
    if (!projectConfig) {
      throw new Error(`project model "${project.model}" not found.`);
    }

    const namespace = await this.namespacesService.createRootNamespace(project);
    const context = this.contextService.createRootContext(project, {
      labels: [...project.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
    });

    return this.workflowProcessorService.processChild(
      projectConfig.entrypoint,
      context,
      context,
    );
  }
}
