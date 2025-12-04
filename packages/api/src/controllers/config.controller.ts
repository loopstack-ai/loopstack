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
  Type,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PipelineSequenceType, WorkspaceType } from '@loopstack/contracts/types';
import {
  BlockRegistryItem,
  BlockRegistryService,
  Workspace,
} from '@loopstack/core';
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

    const resolvedConfigs = blocks.map((block: BlockRegistryItem) => {
      const config = block.config as WorkspaceType;
      return {
        blockName: block.name,
        title: config.title ?? block.name,
      };
    });

    return plainToInstance(WorkspaceConfigDto, resolvedConfigs, {
      excludeExtraneousValues: true,
    });
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

    const filtered = workspaceBlock.metadata.imports.map((item: Type<any>) => {
      const pipelineBlock = this.blockRegistryService.getBlock(item.name);
      if (!pipelineBlock) {
        throw new BadRequestException(
          `Config for pipeline with name ${item.name} not found.`,
        );
      }

      const config = pipelineBlock.config as PipelineSequenceType;
      return {
        blockName: item.name,
        title: config.title,
        description: config.description,
        schema: pipelineBlock.metadata.propertiesSchema,
        ui: config.ui,
      } satisfies PipelineConfigDto;
    });

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(PipelineConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
