import { BadRequestException, Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
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
import {
  getBlockArgsSchema,
  getBlockConfig,
  getBlockWorkflow,
  getBlockWorkflows,
  getWorkflowOptions,
} from '@loopstack/common';
import { BLOCK_METADATA_KEY, BlockOptions } from '@loopstack/common';
import { JSONSchemaDefinition } from '@loopstack/contracts/dist/schemas';
import { WorkflowType, WorkspaceType } from '@loopstack/contracts/types';
import { BlockRegistryItem, BlockRegistryService, WorkflowBase, WorkspaceBase } from '@loopstack/core';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { PipelineSourceDto } from '../dtos/pipeline-source.dto';
import { WorkspaceConfigDto } from '../dtos/workspace-config.dto';

@ApiTags('api/v1/config')
@ApiExtraModels(WorkspaceConfigDto, PipelineConfigDto, PipelineSourceDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/config')
export class ConfigController {
  constructor(private readonly blockRegistryService: BlockRegistryService) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const blocks = this.blockRegistryService.getBlocksByType(WorkspaceBase);

    const resolvedConfigs = blocks.map((block: BlockRegistryItem) => {
      const config = getBlockConfig<WorkspaceType>(block.provider.instance as WorkspaceBase) as WorkspaceType;
      if (!config) {
        throw new Error(`Block ${block.name} is missing @BlockConfig decorator`);
      }

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
  ): PipelineConfigDto {
    const workspaceBlock = this.blockRegistryService.getBlock(workspaceBlockName);
    if (!workspaceBlock) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const instance = workspaceBlock.provider.instance as WorkspaceBase;

    if (!getBlockWorkflows(instance).includes(pipelineName)) {
      throw new BadRequestException(
        `Pipeline with name ${pipelineName} not found in workspace ${workspaceBlockName}. Available: ${getBlockWorkflows(instance).join(', ')}`,
      );
    }

    const workflow = getBlockWorkflow<WorkflowBase>(instance, pipelineName);
    if (!workflow) {
      throw new BadRequestException(`Workflow with name ${pipelineName} not found in workspace ${workspaceBlockName}.`);
    }

    const config = getBlockConfig<WorkflowType>(workflow);
    if (!config) {
      throw new Error(`Block ${workflow.name} is missing @BlockConfig decorator`);
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
    const workspaceBlock = this.blockRegistryService.getBlock(workspaceBlockName);
    if (!workspaceBlock) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const instance = workspaceBlock.provider.instance as WorkspaceBase;

    if (!getBlockWorkflows(instance).includes(pipelineName)) {
      throw new BadRequestException(
        `Pipeline with name ${pipelineName} not found in workspace ${workspaceBlockName}. Available: ${getBlockWorkflows(instance).join(', ')}`,
      );
    }

    const workflow = getBlockWorkflow<WorkflowBase>(instance, pipelineName);
    if (!workflow) {
      throw new BadRequestException(`Workflow with name ${pipelineName} not found in workspace ${workspaceBlockName}.`);
    }

    const ctor = workflow.constructor;
    const metadata = Reflect.getMetadata(BLOCK_METADATA_KEY, ctor) as BlockOptions;

    let raw: string | null = null;
    let filePath: string | null = null;

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
    const workspaceBlock = this.blockRegistryService.getBlock(workspaceBlockName);
    if (!workspaceBlock) {
      throw new BadRequestException(`Config for workspace with name ${workspaceBlockName} not found.`);
    }

    const instance = workspaceBlock.provider.instance as WorkspaceBase;

    const workflows: { name: string; instance: WorkflowBase; hidden: boolean }[] = getBlockWorkflows(instance).map(
      (key) => ({
        name: key,
        instance: instance[key] as WorkflowBase,
        hidden: getWorkflowOptions(instance, key)?.visible === false,
      }),
    );

    const filtered = workflows
      .filter((item) => !item.hidden)
      .map((item) => {
        const config = getBlockConfig<WorkflowType>(item.instance) as WorkflowType;
        if (!config) {
          throw new Error(`Block ${item.name} is missing @BlockConfig decorator`);
        }

        const schema = getBlockArgsSchema(item.instance);
        const propertiesSchema = schema
          ? (this.blockRegistryService.zodToJsonSchema(schema) as JSONSchemaDefinition)
          : undefined;

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
