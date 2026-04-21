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
import { BLOCK_CONFIG_METADATA_KEY, WorkflowInterface } from '@loopstack/common';
import { BlockOptions } from '@loopstack/common';
import type { AvailableEnvironmentInterface } from '@loopstack/contracts/api';
import { BlockConfigCacheService, BlockDiscoveryService } from '@loopstack/core';
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
    private readonly blockConfigCacheService: BlockConfigCacheService,
    @Optional()
    @Inject(LOOPSTACK_AVAILABLE_ENVIRONMENTS)
    private readonly availableEnvironments: AvailableEnvironmentInterface[] = [],
  ) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const resolvedConfigs = this.blockConfigCacheService.getAllWorkspaceConfigs().map((cached) => ({
      className: cached.className,
      title: cached.config.title ?? cached.className,
      features: cached.config.features,
      environments: cached.config.environments,
      ui: cached.resolvedUi as unknown as WorkspaceConfigDto['ui'],
    }));

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
    const cached = this.blockConfigCacheService.getWorkflowConfig(alias);
    if (!cached) {
      const workflow = this.resolveWorkflowByAlias(alias);
      const byClassName = this.blockConfigCacheService.getWorkflowConfig(workflow.constructor.name);
      if (!byClassName) {
        throw new Error(`Block ${workflow.constructor.name} is missing @BlockConfig decorator`);
      }
      return plainToInstance(
        WorkflowConfigDto,
        { ...byClassName.config, transitions: byClassName.transitions },
        { excludeExtraneousValues: true },
      );
    }

    return plainToInstance(
      WorkflowConfigDto,
      { ...cached.config, transitions: cached.transitions },
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
    const cachedWorkspace = this.blockConfigCacheService.getWorkspaceConfig(workspaceBlockName);
    if (!cachedWorkspace) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const filtered = cachedWorkspace.workflowNames.map((name) => {
      const cached = this.blockConfigCacheService.getWorkflowConfig(name);
      if (!cached) {
        throw new Error(`Block ${name} is missing @BlockConfig decorator`);
      }

      return {
        alias: name,
        title: cached.config.title,
        description: cached.config.description,
        schema: cached.argsJsonSchema,
        ui: cached.config.ui,
      } satisfies WorkflowConfigDto;
    });

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(WorkflowConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
