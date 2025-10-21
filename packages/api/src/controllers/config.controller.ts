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
  Param, Type,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  PipelineSequenceType,
  WorkspaceType,
} from '@loopstack/shared';
import { BlockRegistryItem, BlockRegistryService, Workspace } from '@loopstack/core';
import { plainToInstance } from 'class-transformer';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { WorkspaceConfigDto } from '../dtos/workspace-config.dto';
import { sortBy } from 'lodash';

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

    const blocks = this.blockRegistryService.getBlocksByType(Workspace);

    const resolvedConfigs = blocks
      .map((block: BlockRegistryItem) => {
        const config = block.config as WorkspaceType;
        return {
          configKey: block.name,
          title: config.title ?? block.name,
        }
      });

    return plainToInstance(WorkspaceConfigDto, resolvedConfigs, {
      excludeExtraneousValues: true,
    });
  }

  @Get('workspaces/:workspaceConfigKey/pipelines')
  @ApiOperation({
    summary: 'Get all pipeline types available for this workspace',
  })
  @ApiParam({
    name: 'workspaceConfigKey',
    type: String,
    description: 'The config key of the workspace type',
  })
  @ApiOkResponse({ type: PipelineConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getPipelineTypesByWorkspace(
    @Param('workspaceConfigKey') workspaceConfigKey: string,
  ): PipelineConfigDto[] {
    const workspaceBlock = this.blockRegistryService.getBlock(workspaceConfigKey);
    if (!workspaceBlock) {
      throw new BadRequestException(`Config for workspace with name ${workspaceConfigKey} not found.`);
    }

    const filtered = workspaceBlock.metadata.imports.map((item: Type<any>) => {
      const pipelineBlock = this.blockRegistryService.getBlock(item.name);
      if (!pipelineBlock) {
        throw new BadRequestException(`Config for pipeline with name ${item} not found.`);
      }

      const config = pipelineBlock.config as PipelineSequenceType;
      return {
        configKey: item.name,
        title: config.title,
      };
    });

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(PipelineConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
