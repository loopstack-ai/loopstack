import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProjectType, WorkspaceType } from '@loopstack/shared';
import { ConfigurationService } from '@loopstack/core';
import { plainToInstance } from 'class-transformer';
import { ProjectConfigDto } from '../dtos/project-config.dto';
import { WorkspaceConfigDto } from '../dtos/workspace-config.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('api/v1/config')
@ApiExtraModels(WorkspaceConfigDto, ProjectConfigDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/config')
export class ConfigController {

  constructor(private configService: ConfigurationService) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiOkResponse({ type: WorkspaceConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  getWorkspaceTypes(): WorkspaceConfigDto[] {
    const workspaces = this.configService.getAll<WorkspaceType>('workspaces');
    return plainToInstance(WorkspaceConfigDto, workspaces, {
      excludeExtraneousValues: true,
    });
  }

  @Get('workspaces/:workspaceName/projects')
  @ApiOperation({ summary: 'Get all models available for this workspace' })
  @ApiParam({ name: 'workspaceName', type: String, description: 'The name of the workspace type' })
  @ApiOkResponse({ type: ProjectConfigDto, isArray: true })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  getProjectTypesByWorkspace(@Param('workspaceName') workspaceName: string,): ProjectConfigDto[] {
    const projectTypes = this.configService.getAll<ProjectType>('projects');
    const filtered = projectTypes.filter((project) => project.workspace === workspaceName);

    return plainToInstance(ProjectConfigDto, filtered, {
      excludeExtraneousValues: true,
    });
  }
}