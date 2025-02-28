import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request, UsePipes, ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels, ApiOkResponse, ApiNoContentResponse,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { ProjectApiService } from '../services/project-api.service';
import { ProjectUpdateDto } from '../dtos/project-update.dto';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { ProjectQueryDto } from '../dtos/project-query-dto';
import {PaginatedDto} from "../dtos/paginated.dto";
import {ApiPaginatedResponse} from "../decorators/api-paginated-response.decorator";
import {ProjectDto} from "../dtos/project.dto";
import {ProjectItemDto} from "../dtos/project-item.dto";

@ApiTags('api/v1/projects')
@ApiExtraModels(ProjectDto, ProjectItemDto, ProjectCreateDto, ProjectUpdateDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('api/v1/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectApiService) {}

  /**
   * Retrieves all projects for the authenticated user with optional filters, sorting, and pagination.
   */
  @Post('/list')
  @ApiOperation({
    summary: 'Retrieve projects with filters, sorting, and pagination',
  })
  @ApiPaginatedResponse(ProjectItemDto)
  async searchProjects(@Body() query: ProjectQueryDto, @Request() req: any): Promise<PaginatedDto<ProjectItemDto>> {
    const user = req.user || null;
    const result = await this.projectService.findAll(user, query);
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
  async getProjectById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const user = req.user || null;
    const project = await this.projectService.findOneById(id, user);
    return ProjectDto.create(project);
  }

  /**
   * Creates a new project.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: Object, description: 'Project data' })
  @ApiOkResponse({ type: ProjectDto })
  async createProject(
    @Body() projectData: ProjectCreateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const user = req.user || null;
    const project = await this.projectService.create(projectData, user);
    return ProjectDto.create(project);
  }

  /**
   * Updates a project by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiBody({ type: Object, description: 'Updated project data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiOkResponse({ type: ProjectDto })
  async updateProject(
    @Param('id') id: string,
    @Body() projectData: ProjectUpdateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectDto> {
    const user = req.user || null;
    const project = await this.projectService.update(id, projectData, user);
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
  async deleteProject(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    const user = req.user || null;
    await this.projectService.delete(id, user);
  }
}
