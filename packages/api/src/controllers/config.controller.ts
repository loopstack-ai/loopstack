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
import * as path from 'path';
import { toJSONSchema } from 'zod';
import {
  BLOCK_CONFIG_METADATA_KEY,
  WorkflowInterface,
  WorkspaceInterface,
  buildWorkflowTransitions,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockWorkflow,
  getBlockWorkflows,
} from '@loopstack/common';
import { BlockOptions } from '@loopstack/common';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';
import { JSONSchemaDefinition } from '@loopstack/contracts/schemas';
import { WorkflowType, WorkspaceType } from '@loopstack/contracts/types';
import { BlockDiscoveryService } from '@loopstack/core';
import { AvailableEnvironmentDto } from '../dtos/available-environment.dto';
import { WorkflowConfigDto } from '../dtos/workflow-config.dto';
import { WorkflowSourceDto } from '../dtos/workflow-source.dto';
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
  WorkflowConfigDto,
  WorkflowSourceDto,
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

      // Resolve ui.widgets — enrich any widget that references a workflow with its schema/ui
      let resolvedUi: WorkspaceConfigDto['ui'] | undefined;
      const uiWidgets = (config.ui as Record<string, unknown> | undefined)?.widgets as
        | Record<string, unknown>[]
        | undefined;
      if (uiWidgets?.length) {
        const resolvedWidgets = uiWidgets.map((widget) => {
          const options = widget.options as Record<string, unknown> | undefined;
          const workflowName = options?.workflow as string | undefined;
          if (!workflowName) return widget;

          const workflow = getBlockWorkflow<WorkflowInterface>(workspace, workflowName);
          if (!workflow) return widget;

          const workflowConfig = getBlockConfig<WorkflowType>(workflow);
          const argsSchema = getBlockArgsSchema(workflow);

          return {
            ...widget,
            options: {
              ...options,
              schema: argsSchema ? (toJSONSchema(argsSchema) as JSONSchemaDefinition) : undefined,
              workflowUi: workflowConfig?.ui,
            },
          };
        });
        resolvedUi = { widgets: resolvedWidgets } as unknown as WorkspaceConfigDto['ui'];
      }

      return {
        className: workspace.constructor.name,
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

  private resolveWorkflowByAlias(alias: string): WorkflowInterface {
    const workflow = this.blockDiscoveryService.getWorkflowByName(alias);
    if (workflow) {
      return workflow;
    }

    throw new BadRequestException(`Workflow with alias ${alias} not found.`);
  }

  @Get('workflows/:alias')
  @ApiOperation({
    summary: 'Get the full config of a workflow by its alias (class name)',
  })
  @ApiParam({
    name: 'alias',
    type: String,
    description: 'The alias (class name) of the workflow',
  })
  @ApiOkResponse({ type: WorkflowConfigDto })
  @ApiUnauthorizedResponse()
  getWorkflowConfig(@Param('alias') alias: string): WorkflowConfigDto {
    const workflow = this.resolveWorkflowByAlias(alias);

    const config = getBlockConfig<WorkflowType>(workflow);
    if (!config) {
      throw new Error(`Block ${workflow.constructor.name} is missing @BlockConfig decorator`);
    }

    const decoratorTransitions = buildWorkflowTransitions(workflow);
    const transitions = decoratorTransitions.length > 0 ? decoratorTransitions : config.transitions;

    return plainToInstance(
      WorkflowConfigDto,
      { ...config, transitions },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  @Get('workflows/:alias/source')
  @ApiOperation({
    summary: 'Get the source config of a workflow by its alias (class name)',
  })
  @ApiParam({
    name: 'alias',
    type: String,
    description: 'The alias (class name) of the workflow',
  })
  @ApiOkResponse({ type: WorkflowSourceDto })
  @ApiUnauthorizedResponse()
  getWorkflowSource(@Param('alias') alias: string): WorkflowSourceDto {
    const workflow = this.resolveWorkflowByAlias(alias);

    const ctor = workflow.constructor;
    const metadata = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions;

    let raw: string | null = null;
    let filePath: string | null = null;

    if (metadata && typeof metadata.uiConfig === 'string') {
      const yamlPath = metadata.uiConfig;
      const jsPath = yamlPath.replace(/\.ya?ml$/, '.js');
      const mapPath = jsPath + '.map';

      if (fs.existsSync(mapPath)) {
        try {
          const map = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as {
            sources?: string[];
            sourceRoot?: string;
          };
          const source = map.sources?.[0];
          if (source) {
            const resolved = path.resolve(path.dirname(mapPath), map.sourceRoot ?? '', source);
            if (fs.existsSync(resolved)) {
              filePath = resolved;
              raw = fs.readFileSync(resolved, 'utf8');
            }
          }
        } catch {
          // fall through — source map unreadable
        }
      }
    }

    return {
      name: alias,
      filePath,
      raw,
    };
  }

  @Get('workspaces/:workspaceBlockName/workflows/:workflowName')
  @ApiOperation({
    summary: 'Get the full config of a specific workflow by name',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiParam({
    name: 'workflowName',
    type: String,
    description: 'The name of the workflow to retrieve',
  })
  @ApiOkResponse({ type: WorkflowConfigDto })
  @ApiUnauthorizedResponse()
  getWorkflowConfigByName(
    @Param('workspaceBlockName') _workspaceBlockName: string,
    @Param('workflowName') workflowName: string,
  ): WorkflowConfigDto {
    return this.getWorkflowConfig(workflowName);
  }

  @Get('workspaces/:workspaceBlockName/workflows/:workflowName/source')
  @ApiOperation({
    summary: 'Get the source config of a specific workflow by name',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiParam({
    name: 'workflowName',
    type: String,
    description: 'The name of the workflow to retrieve',
  })
  @ApiOkResponse({ type: WorkflowSourceDto })
  @ApiUnauthorizedResponse()
  getWorkflowSourceByName(
    @Param('workspaceBlockName') _workspaceBlockName: string,
    @Param('workflowName') workflowName: string,
  ): WorkflowSourceDto {
    return this.getWorkflowSource(workflowName);
  }

  @Get('workspaces/:workspaceBlockName/workflows')
  @ApiOperation({
    summary: 'Get all workflow types available for this workspace',
  })
  @ApiParam({
    name: 'workspaceBlockName',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiOkResponse({ type: WorkflowConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkflowTypesByWorkspace(@Param('workspaceBlockName') workspaceBlockName: string): WorkflowConfigDto[] {
    const workspace = this.blockDiscoveryService.getWorkspace(workspaceBlockName);
    if (!workspace) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const workflows = getBlockWorkflows(workspace).map((key) => ({
      name: key,
      instance: (workspace as Record<string, unknown>)[key] as WorkflowInterface,
    }));

    const filtered = workflows.map((item) => {
      const config = getBlockConfig<WorkflowType>(item.instance) as WorkflowType;
      if (!config) {
        throw new Error(`Block ${item.name} is missing @BlockConfig decorator`);
      }

      const schema = getBlockArgsSchema(item.instance);
      const propertiesSchema = schema ? (toJSONSchema(schema) as JSONSchemaDefinition) : undefined;

      return {
        alias: item.name,
        title: config.title,
        description: config.description,
        schema: propertiesSchema,
        ui: config.ui,
      } satisfies WorkflowConfigDto;
    });

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(WorkflowConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
