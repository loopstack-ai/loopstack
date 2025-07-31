import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PipelineType, WorkspaceType } from '@loopstack/shared';
import { ConfigurationService } from '@loopstack/core';
import { plainToInstance } from 'class-transformer';
import { PipelineConfigDto } from '../dtos/pipeline-config.dto';
import { WorkspaceConfigDto } from '../dtos/workspace-config.dto';
import { sortBy } from 'lodash';

@ApiTags('api/v1/config')
@ApiExtraModels(WorkspaceConfigDto, PipelineConfigDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/config')
export class ConfigController {
  constructor(private configService: ConfigurationService) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const workspaces = this.configService.getAll<WorkspaceType>('workspaces');
    return plainToInstance(WorkspaceConfigDto, workspaces, {
      excludeExtraneousValues: true,
    });
  }

  @Get('workspaces/:workspaceName/pipelines')
  @ApiOperation({
    summary: 'Get all pipeline types available for this workspace',
  })
  @ApiParam({
    name: 'workspaceName',
    type: String,
    description: 'The name of the workspace type',
  })
  @ApiOkResponse({ type: PipelineConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  getPipelineTypesByWorkspace(
    @Param('workspaceName') workspaceName: string,
  ): PipelineConfigDto[] {
    const pipelineTypes = this.configService.getAll<PipelineType>('pipelines');
    const filtered = pipelineTypes
      .filter(
        (pipeline) =>
          pipeline.config.type === 'root' &&
          pipeline.config.workspace === workspaceName,
      )
      .map((pipeline) => ({
        ...pipeline.config,
        name: `${pipeline.path}:${pipeline.name}`,
      }));

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(PipelineConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
