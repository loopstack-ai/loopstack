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
import { ConfigElement, PipelineRootType, PipelineType, WorkspaceType } from '@loopstack/shared';
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

    const resolvedConfigs = workspaces
      .map((workspace: ConfigElement<WorkspaceType>) => {
        const configElement = this.configService.resolveConfig<WorkspaceType>(
          'workspaces',
          workspace.name,
          workspace.includes,
        );

        return {
          configKey: configElement.key,
          title: configElement.config.title ?? configElement.config.name,
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
    const pipelineTypes = this.configService.getAll<PipelineType>('pipelines');
    const filtered = pipelineTypes
      .filter((pipeline) => pipeline.config.type === 'root')
      .filter((pipeline: ConfigElement<PipelineRootType>) => {
        const workspaceConfig = this.configService.resolveConfig<WorkspaceType>(
          'workspaces',
          pipeline.config.workspace,
          pipeline.includes,
        );

        return workspaceConfig.key === workspaceConfigKey;
      }).map((pipeline: ConfigElement<PipelineRootType>) => ({
        configKey: pipeline.key,
        title: pipeline.config.title,
        workspace: pipeline.config.workspace,
      }));

    const sorted = sortBy(filtered, 'title');

    return plainToInstance(PipelineConfigDto, sorted, {
      excludeExtraneousValues: true,
    });
  }
}
