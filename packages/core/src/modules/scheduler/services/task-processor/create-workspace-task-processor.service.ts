import { Injectable, Logger } from '@nestjs/common';
import { CreateWorkspaceTask, PipelineRootType } from '@loopstack/shared';
import { ConfigurationService } from '../../../configuration';
import { WorkspaceService } from '../../../persistence';
import { IsNull } from 'typeorm';
import { ConfigElementMetadata } from '@loopstack/shared/dist/schemas/config-element.schema';

@Injectable()
export class CreateWorkspaceTaskProcessorService {
  private readonly logger = new Logger(
    CreateWorkspaceTaskProcessorService.name,
  );

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  public async process(
    task: CreateWorkspaceTask,
    metadata?: ConfigElementMetadata,
  ) {
    const workspaceConfig =
      this.configurationService.resolveConfig<PipelineRootType>(
        'workspaces',
        task.payload.workspace,
        metadata?.includes ?? [],
      );
    if (!workspaceConfig) {
      throw new Error(`Workspace not found.`);
    }

    const user: string | null = null; //todo: on behalf of user X

    const existing = await this.workspaceService.getWorkspace({
      configKey: workspaceConfig.key,
      createdBy: null === user ? IsNull() : user,
    });

    if (existing) {
      this.logger.debug(`Workspace already exists. Skipping.`);
      return;
    }

    const workspace = await this.workspaceService.create(
      {
        configKey: workspaceConfig.key,
        title: workspaceConfig.config.title ?? workspaceConfig.name,
      },
      user,
    );

    this.logger.debug(`Workspace created with id ${workspace.id}`);
  }
}
