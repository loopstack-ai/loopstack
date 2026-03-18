import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import { sortBy } from 'lodash';
import { toJSONSchema } from 'zod';
import {
  BLOCK_CONFIG_METADATA_KEY,
  WorkflowInterface,
  WorkspaceInterface,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockWorkflow,
  getBlockWorkflows,
  getWorkflowOptions,
} from '@loopstack/common';
import { BlockOptions } from '@loopstack/common';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';
import { JSONSchemaDefinition } from '@loopstack/contracts/dist/schemas';
import { WorkflowType, WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { AvailableEnvironmentDto } from '../dtos/available-environment.dto';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { PipelineSourceDto } from '../dtos/pipeline-source.dto';
import {
  EnvironmentConfigDto,
  FeaturesDto,
  VolumeDto,
  WorkspaceActionDto,
  WorkspaceConfigDto,
  WorkspaceUiDto,
} from '../dtos/workspace-config.dto';
import { LOOPSTACK_AVAILABLE_ENVIRONMENTS } from '../tokens';

@ApiTags('api/v1/config')
@ApiExtraModels(
  WorkspaceConfigDto,
  PipelineConfigDto,
  PipelineSourceDto,
  VolumeDto,
  FeaturesDto,
  EnvironmentConfigDto,
  AvailableEnvironmentDto,
  WorkspaceActionDto,
  WorkspaceUiDto,
)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/config')
export class ConfigController {
  constructor(
    private readonly blockDiscoveryService: BlockDiscoveryService,
    @Optional()
    @Inject(LOOPSTACK_AVAILABLE_ENVIRONMENTS)
    private readonly availableEnvironments: AvailableEnvironmentInterface[] = [],
  ) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const workspaces = this.blockDiscoveryService.getWorkspaces();

    const resolvedConfigs = workspaces.map((workspace: WorkspaceInterface) => {
      const config = getBlockConfig<WorkspaceType>(workspace) as WorkspaceType;
      if (!config) {
        throw new Error(`Block ${workspace.constructor.name} is missing @BlockConfig decorator`);
      }

      // Resolve ui.actions — enrich any action that references a pipeline with its schema/ui
      let resolvedUi: WorkspaceConfigDto['ui'] | undefined;
      if (config.ui?.actions?.length) {
        const resolvedActions = config.ui.actions.map((action) => {
          const pipelineName = action.options?.workflow as string | undefined;
          if (!pipelineName) return action;

          const workflow = getBlockWorkflow<WorkflowInterface>(workspace, pipelineName);
          if (!workflow) return action;

          const workflowConfig = getBlockConfig<WorkflowType>(workflow);
          const argsSchema = getBlockArgsSchema(workflow);

          return {
            ...action,
            options: {
              ...action.options,
              schema: argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined,
              pipelineUi: workflowConfig?.ui,
            },
          };
        });
        resolvedUi = { actions: resolvedActions };
      }

      return {
        blockName: workspace.constructor.name,
        title: config.title ?? workspace.constructor.name,
        features: config.features,
        environments: config.environments,
        ui: resolvedUi,
      };
    });

    return plainToInstance(WorkspaceConfigDto, resolvedConfigs, {
      excludeExtraneousValues: true,
    });
  }

  @Get('environments')
  @ApiOperation({ summary: 'Get available environments configured for this backend' })
  @ApiOkResponse({ type: AvailableEnvironmentDto, isArray: true })
  @ApiUnauthorizedResponse()
  getAvailableEnvironments(): AvailableEnvironmentDto[] {
    return plainToInstance(AvailableEnvironmentDto, this.availableEnvironments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('workspaces/:workspaceBlockName/pipelines/:pipelineName')
  @ApiOperation({
    summary: 'Get the full config of a specific pipeline by name',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiParam({
    name: 'pipelineName',
    type: String,
    description: 'The name of the pipeline to retrieve',
  })
  @ApiOkResponse({ type: PipelineConfigDto })
  @ApiUnauthorizedResponse()
  getPipelineConfigByName(
    @Param('workspaceBlockName') workspaceBlockName: string,
    @Param('pipelineName') pipelineName: string,
  ): PipelineConfigDto {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceBlockName);
    if (!workspace) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    if (!getBlockWorkflows(workspace).includes(pipelineName)) {
      throw new BadRequestException(
        `Pipeline with name ${pipelineName} not found in workspace ${workspaceBlockName}. Available: ${getBlockWorkflows(workspace).join(', ')}`,
      );
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspace, pipelineName);
    if (!workflow) {
      throw new BadRequestException(`Workflow with name ${pipelineName} not found in workspace ${workspaceBlockName}.`);
    }

    const config = getBlockConfig<WorkflowType>(workflow);
    if (!config) {
      throw new Error(`Block ${workflow.constructor.name} is missing @BlockConfig decorator`);
    }

    return plainToInstance(PipelineConfigDto, config, {
      excludeExtraneousValues: true,
    });
  }

  @Get('workspaces/:workspaceBlockName/pipelines/:pipelineName/source')
  @ApiOperation({
    summary: 'Get the source config of a specific pipeline by name',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiParam({
    name: 'pipelineName',
    type: String,
    description: 'The name of the pipeline to retrieve',
  })
  @ApiOkResponse({ type: PipelineSourceDto })
  @ApiUnauthorizedResponse()
  getPipelineSourceByName(
    @Param('workspaceBlockName') workspaceBlockName: string,
    @Param('pipelineName') pipelineName: string,
  ): PipelineSourceDto {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceBlockName);
    if (!workspace) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    if (!getBlockWorkflows(workspace).includes(pipelineName)) {
      throw new BadRequestException(
        `Pipeline with name ${pipelineName} not found in workspace ${workspaceBlockName}. Available: ${getBlockWorkflows(workspace).join(', ')}`,
      );
    }

    const workflow = getBlockWorkflow<WorkflowInterface>(workspace, pipelineName);
    if (!workflow) {
      throw new BadRequestException(`Workflow with name ${pipelineName} not found in workspace ${workspaceBlockName}.`);
    }

    const ctor = workflow.constructor;
    const metadata = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions;

    let raw: string | null = null;
    let filePath: string | null = null;

    // SECURITY: metadata.configFile originates from the @BlockConfig decorator applied at
    // compile time and is not influenced by user input. If this assumption ever changes (e.g.
    // configFile becomes user-configurable or stored in the database), a path traversal check
    // must be added here to ensure filePath resolves within an allowed base directory.
    // See FileSystemService.validatePath() for a reference implementation.
    if (metadata && metadata.configFile) {
      filePath = metadata.configFile;
      if (fs.existsSync(filePath)) {
        raw = fs.readFileSync(filePath, 'utf8');
      }
    }

    return {
      name: pipelineName,
      filePath,
      raw,
    };
  }

  @Get('workspaces/:workspaceBlockName/pipelines')
  @ApiOperation({
    summary: 'Get all pipeline types available for this workspace',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiOkResponse({ type: PipelineConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getPipelineTypesByWorkspace(@Param('workspaceBlockName') workspaceBlockName: string): PipelineConfigDto[] {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceBlockName);
    if (!workspace) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const workflows: { name: string; instance: WorkflowInterface; hidden: boolean }[] = getBlockWorkflows(
      workspace,
    ).map((key) => ({
      name: key,
      instance: (workspace as Record<string, unknown>)[key] as WorkflowInterface,
      hidden: getWorkflowOptions(workspace, key)?.visible === false,
    }));

    const filtered = workflows
      .filter((item) => !item.hidden)
      .map((item) => {
        const config = getBlockConfig<WorkflowType>(item.instance) as WorkflowType;
        if (!config) {
          throw new Error(`Block ${item.name} is missing @BlockConfig decorator`);
        }

        const schema = getBlockArgsSchema(item.instance);
        const propertiesSchema = schema ? (toJSONSchema(schema) as JSONSchemaDefinition) : undefined;

        return {
          blockName: item.name,
          title: config.title,
          description: config.description,
          schema: propertiesSchema,
          ui: config.ui,
        } satisfies PipelineConfigDto;
      });

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(PipelineConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
