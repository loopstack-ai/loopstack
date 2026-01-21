import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WorkflowType, WorkspaceType } from '@loopstack/contracts/types';
import {
  BlockRegistryItem,
  BlockRegistryService, WorkflowBase,
  WorkspaceBase,
} from '@loopstack/core';
import { plainToInstance } from 'class-transformer';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { WorkspaceConfigDto } from '../dtos/workspace-config.dto';
import { sortBy } from 'lodash';
import { getWorkflowOptions } from '@loopstack/common';

@ApiTags('api/v1/config')
@ApiExtraModels(WorkspaceConfigDto, PipelineConfigDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/config')
export class ConfigController {
  constructor(
    private readonly blockRegistryService: BlockRegistryService,

  ) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const blocks = this.blockRegistryService.getBlocksByType(WorkspaceBase);

    const resolvedConfigs = blocks.map((block: BlockRegistryItem) => {
      const config = block.provider.instance.config as WorkspaceType;
      return {
        blockName: block.name,
        title: config.title ?? block.name,
      };
    });

    return plainToInstance(WorkspaceConfigDto, resolvedConfigs, {
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
  ): WorkflowType {
    const workspaceBlock =
      this.blockRegistryService.getBlock(workspaceBlockName);
    if (!workspaceBlock) {
      throw new BadRequestException(
        `Config for workspace with name ${workspaceBlockName} not found.`,
      );
    }

    const instance = workspaceBlock.provider.instance as WorkspaceBase;

    if (!instance.workflows.includes(pipelineName)) {
      throw new BadRequestException(
        `Pipeline with name ${pipelineName} not found in workspace ${workspaceBlockName}. Available: ${instance.workflows.join(', ')}`,
      );
    }

    const workflow = instance.getWorkflow(pipelineName);
    if (!workflow) {
      throw new BadRequestException(
        `Workflow with name ${pipelineName} not found in workspace ${workspaceBlockName}.`,
      );
    }
    const config = workflow.config as WorkflowType;

    return config;
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
  getPipelineTypesByWorkspace(
    @Param('workspaceBlockName') workspaceBlockName: string,
  ): PipelineConfigDto[] {
    const workspaceBlock =
      this.blockRegistryService.getBlock(workspaceBlockName);
    if (!workspaceBlock) {
      throw new BadRequestException(
        `Config for workspace with name ${workspaceBlockName} not found.`,
      );
    }

    const instance = workspaceBlock.provider.instance as WorkspaceBase;

    const workflows: { name: string, instance: WorkflowBase, hidden: boolean }[] = instance.workflows.reduce((acc, key) => [
      ...acc,
      {
        name: key,
        instance: instance[key],
        hidden: getWorkflowOptions(instance, key)?.visible === false
      }
    ], []);

    const filtered = workflows.filter((item) => !item.hidden).map((item) => {
      const config = item.instance.config as WorkflowType;

      const propertiesSchema = item.instance.argsSchema ? this.blockRegistryService.zodToJsonSchema(item.instance.argsSchema) : undefined;

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
