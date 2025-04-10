import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '../../configuration';
import { NamespacesService, ProjectService } from '../../persistence';
import { WorkflowProcessorService } from '../../workflow-processor';
import { ContextService } from '../../common';
import {
  ContextInterface,
  ProcessRunInterface,
  ProjectType,
} from '@loopstack/shared';

@Injectable()
export class ProjectProcessorService {
  private readonly logger = new Logger(ProjectProcessorService.name);
  constructor(
    private loopConfigService: ConfigurationService,
    private projectService: ProjectService,
    private workflowProcessorService: WorkflowProcessorService,
    private namespacesService: NamespacesService,
    private contextService: ContextService,
  ) {}

  async processProject(
    payload: ProcessRunInterface,
  ): Promise<ContextInterface> {
    this.logger.debug(`Processing project: ${payload.projectId}`);

    const project = await this.projectService.getProject(
      payload.projectId,
      payload.userId,
    );
    if (!project) {
      throw new Error(`project "${payload.projectId}" not found.`);
    }

    const projectConfig = this.loopConfigService.get<ProjectType>(
      'projects',
      project.model,
    );
    if (!projectConfig) {
      throw new Error(`project model "${project.model}" not found.`);
    }

    const namespace = await this.namespacesService.createRootNamespace(project);
    const context = this.contextService.createRootContext(project, {
      labels: [...project.labels, namespace.name],
      namespace: namespace,
      transition: payload.transition,
    });

    return this.workflowProcessorService.start(
      projectConfig.entrypoint,
      context,
    );
  }
}
