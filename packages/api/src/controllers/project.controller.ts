import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UsePipes,
  ValidationPipe,
  Query,
  ParseIntPipe,
  BadRequestException, UseGuards, UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { ProjectApiService } from '../services/project-api.service';
import { ProjectUpdateDto } from '../dtos/project-update.dto';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { PaginatedDto } from '../dtos/paginated.dto';
import { ApiPaginatedResponse } from '../decorators/api-paginated-response.decorator';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectItemDto } from '../dtos/project-item.dto';
import { ProjectSortByDto } from '../dtos/project-sort-by.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('api/v1/projects')
@ApiExtraModels(ProjectDto, ProjectItemDto, ProjectCreateDto, ProjectUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectApiService) {}

  /**
   * Retrieves all projects for the authenticated user with optional filters, sorting, and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve projects with filters, sorting, and pagination',
  })
  @ApiExtraModels(ProjectFilterDto, ProjectSortByDto)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    schema: {
      type: 'string',
      example: '[{"field":"createdAt","order":"DESC"}]',
    },
    description: 'JSON string array of ProjectSortByDto objects',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    schema: {
      type: 'string',
      example: '{"workspaceId":"123e4567-e89b-12d3-a456-426614174000"}',
    },
    description: 'JSON string of ProjectFilterDto object',
  })
  @ApiPaginatedResponse(ProjectItemDto)
  @UseGuards(JwtAuthGuard)
  async getProjects(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('filter') filterParam?: string,
    @Query('sortBy') sortByParam?: string,
  ): Promise<PaginatedDto<ProjectItemDto>> {
    let filter: ProjectFilterDto = {};
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam) as ProjectFilterDto;
      } catch (e) {
        throw new BadRequestException('Invalid filter format');
      }
    }

    let sortBy: ProjectSortByDto[] = [];
    if (sortByParam) {
      try {
        sortBy = JSON.parse(sortByParam) as ProjectSortByDto[];
      } catch (e) {
        throw new BadRequestException('Invalid sortBy format');
      }
    }

    const result = await this.projectService.findAll(req.user.id, filter, sortBy, {
      page,
      limit,
    });
    return PaginatedDto.create(ProjectItemDto, result);
  }

  /**
   * Retrieves a project by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  async getProjectById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const project = await this.projectService.findOneById(id, req.user.id);
    return ProjectDto.create(project);
  }

  /**
   * Creates a new project.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: ProjectCreateDto, description: 'Project data' })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  async createProject(
    @Body() projectData: ProjectCreateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const project = await this.projectService.create(projectData, req.user.id);
    return ProjectDto.create(project);
  }

  /**
   * Updates a project by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiBody({ type: ProjectUpdateDto, description: 'Updated project data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiOkResponse({ type: ProjectDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  async updateProject(
    @Param('id') id: string,
    @Body() projectData: ProjectUpdateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const project = await this.projectService.update(id, projectData, req.user.id);
    return ProjectDto.create(project);
  }

  /**
   * Deletes a project by its ID.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  async deleteProject(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    await this.projectService.delete(id, req.user.id);
  }
}
