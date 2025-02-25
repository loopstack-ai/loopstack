import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ApiRequestType } from '../interfaces/api-request.type';
import { ProjectApiService } from '../services/project-api.service';
import { ProjectUpdateDto } from '../dtos/project-update.dto';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { ProjectEntity } from '@loopstack/core/dist/persistence/entities/project.entity';
import { ProjectQueryDto } from '../dtos/project-query-dto';

@ApiTags('api/v1/projects')
@ApiExtraModels(ProjectEntity, ProjectCreateDto, ProjectUpdateDto)
// @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async searchProjects(@Body() query: ProjectQueryDto, @Request() req: any) {
    const user = req.user || null;
    return this.projectService.findAll(user, query);
  }

  /**
   * Retrieves a project by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectById(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<ProjectEntity> {
    const user = req.user || null;
    return this.projectService.findOneById(id, user);
  }

  /**
   * Creates a new project.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: Object, description: 'Project data' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async createProject(
    @Body() projectData: ProjectCreateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectEntity> {
    const user = req.user || null;
    return this.projectService.create(projectData, user);
  }

  /**
   * Updates a project by its ID.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiBody({ type: Object, description: 'Updated project data' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @Param('id') id: string,
    @Body() projectData: ProjectUpdateDto,
    @Request() req: ApiRequestType,
  ): Promise<ProjectEntity> {
    const user = req.user || null;
    return this.projectService.update(id, projectData, user);
  }

  /**
   * Deletes a project by its ID.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(
    @Param('id') id: string,
    @Request() req: ApiRequestType,
  ): Promise<void> {
    const user = req.user || null;
    await this.projectService.delete(id, user);
  }
}
